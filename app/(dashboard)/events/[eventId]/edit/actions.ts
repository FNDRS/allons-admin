"use server";

import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { requireRootActor } from "@/lib/admin/getRootActor";
import { updateAdminEvent } from "@/lib/admin/eventsApi";
import { deleteUpload } from "@/lib/admin/uploadsApi";
import { parseUploadedFiles, type UploadedFile } from "@/lib/admin/uploads";
import { isInsideHonduras, resolveKnownCity } from "@/lib/hondurasLocations";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type UpdateAdminEventState = { ok: false; error: string } | null;

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function formNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(formString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function formOptionalNumber(formData: FormData, key: string) {
  const raw = formString(formData, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function parseLocalDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Same calendar day as `date` unless the end clock is at or before start,
 * in which case it rolls to the next day. Empty end stays null so the API
 * fills in one hour after start.
 */
function parseEndsAt(date: string, endTime: string, startsAt: string) {
  if (!endTime) return null;
  const endsAt = parseLocalDateTime(date, endTime);
  if (!endsAt) return null;
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    const nextDay = new Date(endsAt);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay.toISOString();
  }
  return endsAt;
}

function fail(message: string): UpdateAdminEventState {
  return { ok: false, error: message };
}

function parseEventImages(formData: FormData): UploadedFile[] | null {
  const raw = formString(formData, "eventImages");
  if (!raw) return [];

  try {
    return parseUploadedFiles(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Only new uploads: persisted gallery files stay in storage. */
async function deleteNewUploadedImages(images: UploadedFile[]) {
  await Promise.all(
    images
      .filter((image) => image.persisted !== true)
      .map((image) =>
        deleteUpload("event-image", image.path).catch((error) => {
          console.warn("[events/edit] no se pudo borrar la imagen", error);
        }),
      ),
  );
}

export async function updateAdminEventAction(
  _prevState: UpdateAdminEventState,
  formData: FormData,
): Promise<UpdateAdminEventState> {
  const caller = await requireRootActor();

  const eventId = formString(formData, "eventId");
  const title = formString(formData, "title");
  const venue = formString(formData, "venue");
  const address = formString(formData, "address");
  const latitude = formOptionalNumber(formData, "latitude");
  const longitude = formOptionalNumber(formData, "longitude");
  const date = formString(formData, "date");
  const time = formString(formData, "time");
  const startsAt = parseLocalDateTime(date, time);
  const endTime = formString(formData, "endTime");
  const city = resolveKnownCity({
    parts: [formString(formData, "city"), address, venue],
    latitude,
    longitude,
  });
  const category = formString(formData, "category");
  const uploadedImages = parseEventImages(formData);

  if (!eventId) return fail("No se encontró el evento.");
  if (!title) return fail("El título es obligatorio.");
  if (latitude == null || longitude == null) {
    return fail("Marca el lugar exacto del evento con un pin en el mapa.");
  }
  if (!isInsideHonduras(latitude, longitude)) {
    return fail("El pin del evento debe estar dentro de Honduras.");
  }
  if (!city) {
    return fail(
      "No pudimos reconocer la ciudad del pin. Mueve el pin a una ciudad de Honduras.",
    );
  }
  if (!startsAt) return fail("Configura fecha y hora válidas.");
  if (!category) {
    return fail("Selecciona la categoría del evento.");
  }
  if (uploadedImages === null) {
    return fail("Las imágenes del evento no tienen un formato válido.");
  }

  try {
    await updateAdminEvent(
      eventId,
      {
        title,
        description: formString(formData, "description") || null,
        startsAt,
        endsAt: parseEndsAt(date, endTime, startsAt),
        city,
        venue: venue || null,
        address: address || null,
        latitude,
        longitude,
        capacity: Math.max(1, Math.floor(formNumber(formData, "capacity", 1))),
        themeColor: formString(formData, "themeColor") || "#F67010",
        category,
        imageUrls: uploadedImages.map((image) => image.url),
      },
      caller,
    );
  } catch (error) {
    await deleteNewUploadedImages(uploadedImages);
    return fail(adminApiErrorMessage(error, "No se pudo actualizar el evento."));
  }

  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/providers");
  redirect(`/events/${eventId}`);
}
