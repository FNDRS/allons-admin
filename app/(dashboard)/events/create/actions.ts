"use server";

import {
  normalizeDemoFormFields,
  saveDemoEventForm,
  type DemoEventFormField,
} from "@/lib/demoEventForms";
import { isInsideHonduras, resolveKnownCity } from "@/lib/hondurasLocations";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateAdminEventState = { error: string } | null;

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

function addHours(iso: string, hours: number) {
  const date = new Date(iso);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

function fail(message: string): CreateAdminEventState {
  return { error: message };
}

function parseFormFields(formData: FormData): DemoEventFormField[] | null {
  const rawFields = formString(formData, "fields");
  if (!rawFields) return [];

  try {
    return normalizeDemoFormFields(JSON.parse(rawFields));
  } catch {
    return null;
  }
}

const EVENT_IMAGE_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

const EVENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

type UploadedEventImage = {
  url: string;
  path: string;
};

function describeImageFile(file: File) {
  const rawExtension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentTypeFromExtension = EVENT_IMAGE_CONTENT_TYPES[rawExtension];
  const contentTypeFromFile = Object.values(EVENT_IMAGE_CONTENT_TYPES).includes(
    file.type,
  )
    ? file.type
    : null;
  const contentType = contentTypeFromExtension ?? contentTypeFromFile;
  const extension = contentTypeFromExtension
    ? rawExtension
    : Object.entries(EVENT_IMAGE_CONTENT_TYPES).find(
        ([, type]) => type === contentTypeFromFile,
      )?.[0] ?? "jpg";

  if (!contentType) {
    throw new Error(
      `Formato no permitido para ${file.name}. Usa JPG, PNG, WEBP, HEIC o HEIF.`,
    );
  }

  return { extension, contentType };
}

function eventImageFiles(formData: FormData) {
  return formData
    .getAll("eventImages")
    .filter((value): value is File => value instanceof File && value.size > 0)
    .slice(0, 10);
}

async function uploadEventImages(files: File[]): Promise<UploadedEventImage[]> {
  if (files.length === 0) return [];
  const admin = createSupabaseServiceRoleClient();

  const results = await Promise.allSettled(
    files.map(async (file, index): Promise<UploadedEventImage> => {
      if (file.size > EVENT_IMAGE_MAX_BYTES) {
        throw new Error(`${file.name} supera el limite de 10 MB.`);
      }

      const { extension, contentType } = describeImageFile(file);
      const filename = `gallery/admin_${Date.now()}_${index}_${Math.random()
        .toString(36)
        .slice(2, 8)}.${extension}`;
      const { data, error } = await admin.storage
        .from("event-images")
        .upload(filename, await file.arrayBuffer(), {
          contentType,
          upsert: false,
        });

      if (error) {
        throw new Error(`Error subiendo ${file.name}: ${error.message}`);
      }
      return {
        path: data.path,
        url: admin.storage.from("event-images").getPublicUrl(data.path).data
          .publicUrl,
      };
    }),
  );

  const uploaded = results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
  const rejected = results.find((result) => result.status === "rejected");
  if (rejected?.status === "rejected") {
    await deleteUploadedEventImages(uploaded);
    throw rejected.reason instanceof Error
      ? rejected.reason
      : new Error("No se pudieron subir las imagenes.");
  }

  return uploaded;
}

async function deleteUploadedEventImages(images: UploadedEventImage[]) {
  if (images.length === 0) return;
  const admin = createSupabaseServiceRoleClient();
  await admin.storage
    .from("event-images")
    .remove(images.map((image) => image.path));
}

export async function createAdminEventAction(
  _prevState: CreateAdminEventState,
  formData: FormData,
): Promise<CreateAdminEventState> {
  const providerId = formString(formData, "providerId");
  const title = formString(formData, "title");
  const venue = formString(formData, "venue");
  const address = formString(formData, "address");
  const latitude = formOptionalNumber(formData, "latitude");
  const longitude = formOptionalNumber(formData, "longitude");
  const date = formString(formData, "date");
  const time = formString(formData, "time");
  const startsAt = parseLocalDateTime(date, time);
  const city = resolveKnownCity({
    parts: [formString(formData, "city"), address, venue],
    latitude,
    longitude,
  });

  if (!providerId) return fail("Selecciona el comercio.");
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

  const admin = createSupabaseServiceRoleClient();
  const { data: provider, error: providerError } = await admin
    .from("providers")
    .select("id, name")
    .eq("id", providerId)
    .maybeSingle();
  if (providerError || !provider) {
    return fail(providerError?.message ?? "Comercio no encontrado.");
  }

  const status = formString(formData, "status") === "published" ? "published" : "draft";
  const capacity = Math.max(1, Math.floor(formNumber(formData, "capacity", 1)));
  const ticketName = formString(formData, "ticketName") || "General";
  const ticketPrice = Math.max(0, formNumber(formData, "ticketPrice", 0));
  const ticketTotal = Math.max(1, Math.floor(formNumber(formData, "ticketTotal", capacity)));
  const saleStartsAt = new Date().toISOString();
  const saleEndsAt = startsAt;
  const ticketMode = ticketPrice > 0 ? "single_access" : "free";
  const themeColor = formString(formData, "themeColor") || "#F67010";
  const formFields = parseFormFields(formData);
  const imageFiles = eventImageFiles(formData);

  if (formFields === null) {
    return fail("El formulario personalizado no tiene un formato válido.");
  }

  let uploadedImages: UploadedEventImage[] = [];
  try {
    uploadedImages = await uploadEventImages(imageFiles);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "No se pudieron subir las imagenes.",
    );
  }

  const { data: event, error: eventError } = await admin
    .from("events")
    .insert({
      provider_id: providerId,
      title,
      description: formString(formData, "description") || null,
      starts_at: startsAt,
      ends_at: addHours(startsAt, 2),
      city,
      venue: venue || null,
      address: address || null,
      latitude,
      longitude,
      capacity,
      status,
      event_type: "single",
      ticket_mode: ticketMode,
      theme_color: themeColor,
      cover_image_url: uploadedImages[0]?.url ?? null,
      refund_policy: "none",
    })
    .select("id")
    .single();

  if (eventError || !event) {
    await deleteUploadedEventImages(uploadedImages);
    return fail(eventError?.message ?? "No se pudo crear el evento.");
  }

  const { error: ticketError } = await admin
    .from("provider_event_ticket_types")
    .insert({
      provider_id: providerId,
      event_id: event.id,
      name: ticketName,
      kind: "general",
      price: ticketPrice,
      total: ticketTotal,
      active: true,
      sort_order: 0,
      sale_starts_at: ticketPrice > 0 ? saleStartsAt : null,
      sale_ends_at: ticketPrice > 0 ? saleEndsAt : null,
    });

  if (ticketError) {
    await admin.from("events").delete().eq("id", event.id);
    await deleteUploadedEventImages(uploadedImages);
    return fail(ticketError.message);
  }

  const galleryImages = uploadedImages.slice(1);
  if (galleryImages.length > 0) {
    const { error: galleryError } = await admin.from("event_media").insert(
      galleryImages.map((image, index) => ({
        event_id: event.id,
        url: image.url,
        sort_order: index + 1,
      })),
    );

    if (galleryError) {
      await admin
        .from("provider_event_ticket_types")
        .delete()
        .eq("event_id", event.id);
      await admin.from("events").delete().eq("id", event.id);
      await deleteUploadedEventImages(uploadedImages);
      return fail(`No se pudo guardar la galeria: ${galleryError.message}`);
    }
  }

  if (formFields.length > 0) {
    try {
      await saveDemoEventForm(event.id, formFields);
    } catch (error) {
      await admin
        .from("provider_event_ticket_types")
        .delete()
        .eq("event_id", event.id);
      await admin.from("events").delete().eq("id", event.id);
      await deleteUploadedEventImages(uploadedImages);
      return fail(
        error instanceof Error
          ? `No se pudo guardar el formulario: ${error.message}`
          : "No se pudo guardar el formulario.",
      );
    }
  }

  await admin.from("provider_activity_log").insert({
    provider_id: providerId,
    type: "event",
    message: `Evento creado desde admin: ${title}`,
    meta: event.id,
  });

  revalidatePath("/events");
  revalidatePath(`/events/${event.id}`);
  revalidatePath(`/events/${event.id}/formulario`);
  redirect(`/events/${event.id}/formulario?created=1` as unknown as never);
}
