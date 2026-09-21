"use server";

import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { requireRootActor } from "@/lib/admin/getRootActor";
import { createAdminEvent } from "@/lib/admin/eventsApi";
import { deleteUpload } from "@/lib/admin/uploadsApi";
import {
  normalizeDemoFormFields,
  type DemoEventFormField,
} from "@/lib/demoEventForms";
import {
  normalizeTicketDrafts,
  type EventTicketDraft,
} from "@/lib/eventTickets";
import { parseUploadedFiles, type UploadedFile } from "@/lib/admin/uploads";
import { isInsideHonduras, resolveKnownCity } from "@/lib/hondurasLocations";
import { revalidatePath } from "next/cache";

/**
 * El caso exitoso no redirige: vuelve al formulario para que muestre el modal
 * con el evento creado y sus accesos.
 */
export type CreateAdminEventState =
  | { ok: false; error: string }
  | { ok: true; eventId: string; title: string; published: boolean }
  | null;

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

function fail(message: string): CreateAdminEventState {
  return { ok: false, error: message };
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

/**
 * Las imágenes ya se subieron desde el navegador contra
 * `/api/admin/uploads`: por el Server Action sólo viajan sus URLs, porque
 * Next corta el body del action a 1 MB.
 */
function parseEventImages(formData: FormData): UploadedFile[] | null {
  const raw = formString(formData, "eventImages");
  if (!raw) return [];

  try {
    return parseUploadedFiles(JSON.parse(raw));
  } catch {
    return null;
  }
}

function parseTicketTypes(formData: FormData): EventTicketDraft[] | null {
  const raw = formString(formData, "ticketTypes");
  if (!raw) return [];

  try {
    return normalizeTicketDrafts(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Las imágenes se suben antes de guardar. Si el evento no llega a crearse,
 * quedarían huérfanas en el bucket, así que se borran por la misma API que
 * las subió.
 */
async function deleteUploadedEventImages(images: UploadedFile[]) {
  await Promise.all(
    images.map((image) =>
      deleteUpload("event-image", image.path).catch((error) => {
        console.warn("[events/create] no se pudo borrar la imagen", error);
      }),
    ),
  );
}

export async function createAdminEventAction(
  _prevState: CreateAdminEventState,
  formData: FormData,
): Promise<CreateAdminEventState> {
  const caller = await requireRootActor();

  const providerId = formString(formData, "providerId");
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

  const formFields = parseFormFields(formData);
  const ticketTypes = parseTicketTypes(formData);
  const uploadedImages = parseEventImages(formData);
  const category = formString(formData, "category");

  if (formFields === null) {
    return fail("El formulario personalizado no tiene un formato válido.");
  }
  if (uploadedImages === null) {
    return fail("Las imágenes del evento no tienen un formato válido.");
  }
  if (ticketTypes === null) {
    return fail("Los tipos de entrada no tienen un formato válido.");
  }
  if (ticketTypes.length === 0) {
    return fail("Agrega al menos un tipo de entrada con nombre y cantidad.");
  }
  if (!category) {
    return fail("Selecciona la categoría del evento.");
  }

  const hasAnyPaidTicket = ticketTypes.some((ticket) => ticket.price > 0);
  const refundPolicyRaw = formString(formData, "refundPolicy");
  const refundPolicy =
    hasAnyPaidTicket &&
    (refundPolicyRaw === "partial" || refundPolicyRaw === "full")
      ? refundPolicyRaw
      : "none";

  let created: { eventId: string; title: string; published: boolean };
  try {
    created = await createAdminEvent(
      {
        providerId,
        title,
        description: formString(formData, "description") || null,
        startsAt,
        // El fin declarado sólo lo respeta la API si cae después del inicio.
        endsAt: parseLocalDateTime(date, endTime),
        city,
        venue: venue || null,
        address: address || null,
        latitude,
        longitude,
        capacity: Math.max(1, Math.floor(formNumber(formData, "capacity", 1))),
        status:
          formString(formData, "status") === "published"
            ? "published"
            : "draft",
        themeColor: formString(formData, "themeColor") || "#F67010",
        category,
        kitPickupInfo: formString(formData, "kitPickupInfo") || null,
        refundPolicy,
        refundPartialPct: formNumber(formData, "refundPartialPct", 50),
        refundDeadlineDays: formNumber(formData, "refundDeadlineDays", 2),
        ticketTypes: ticketTypes.map((ticket) => ({
          name: ticket.name,
          kind: ticket.kind,
          price: ticket.price,
          total: ticket.total,
          saleStartsAt: ticket.saleStartsAt,
          saleEndsAt: ticket.saleEndsAt,
          donationEnabled: ticket.donationEnabled,
        })),
        imageUrls: uploadedImages.map((image) => image.url),
        formFields,
      },
      caller,
    );
  } catch (error) {
    await deleteUploadedEventImages(uploadedImages);
    return fail(adminApiErrorMessage(error, "No se pudo crear el evento."));
  }

  revalidatePath("/events");
  revalidatePath(`/events/${created.eventId}`);
  revalidatePath(`/events/${created.eventId}/formulario`);

  return {
    ok: true,
    eventId: created.eventId,
    title: created.title,
    published: created.published,
  };
}
