"use server";

import {
  normalizeDemoFormFields,
  saveDemoEventForm,
  type DemoEventFormField,
} from "@/lib/demoEventForms";
import { toInterestSlug } from "@/lib/eventCategories";
import {
  normalizeTicketDrafts,
  type EventTicketDraft,
} from "@/lib/eventTickets";
import {
  parseUploadedFiles,
  type UploadedFile,
} from "@/lib/admin/uploads";
import { isInsideHonduras, resolveKnownCity } from "@/lib/hondurasLocations";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
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

function addHours(iso: string, hours: number) {
  const date = new Date(iso);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
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
 * La categoría vive en `interests` + `event_interests`. Misma resolución de
 * slug que `event-category.ts` en allons-api, para no duplicar filas.
 */
async function resolveInterestId(
  admin: ReturnType<typeof createSupabaseServiceRoleClient>,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  const slug = toInterestSlug(trimmed);
  if (!trimmed || !slug) return null;

  // `slug` y `name` son únicos, y una categoría libre puede traer comas, así
  // que se consultan por separado en vez de con un filtro `or` interpolado.
  const findExisting = async () => {
    const { data: bySlug } = await admin
      .from("interests")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (bySlug?.id) return bySlug.id as string;

    const { data: byName } = await admin
      .from("interests")
      .select("id")
      .eq("name", trimmed)
      .maybeSingle();
    return (byName?.id as string | undefined) ?? null;
  };

  const existing = await findExisting();
  if (existing) return existing;

  const { data: created } = await admin
    .from("interests")
    .insert({ slug, name: trimmed })
    .select("id")
    .maybeSingle();
  if (created?.id) return created.id as string;

  // Otra escritura ganó la carrera con el mismo slug.
  return findExisting();
}

async function deleteUploadedEventImages(images: UploadedFile[]) {
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
  const themeColor = formString(formData, "themeColor") || "#F67010";
  const category = formString(formData, "category");
  const formFields = parseFormFields(formData);
  const ticketTypes = parseTicketTypes(formData);
  const uploadedImages = parseEventImages(formData);

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

  // Un evento con cualquier entrada de pago cobra por Paygate; si todas son
  // gratuitas queda como registro libre.
  const hasAnyPaidTicket = ticketTypes.some((ticket) => ticket.price > 0);
  const ticketMode = hasAnyPaidTicket ? "single_access" : "free";
  const refundPolicyRaw = formString(formData, "refundPolicy");
  const refundPolicy =
    hasAnyPaidTicket && (refundPolicyRaw === "partial" || refundPolicyRaw === "full")
      ? refundPolicyRaw
      : "none";
  const refundPartialPct =
    refundPolicy === "partial"
      ? Math.max(1, Math.min(99, formNumber(formData, "refundPartialPct", 50)))
      : null;
  const refundDeadlineDays =
    refundPolicy !== "none"
      ? Math.max(0, Math.floor(formNumber(formData, "refundDeadlineDays", 2)))
      : null;

  // El fin declarado sólo se respeta si cae después del inicio; si no, una hora.
  const endsAtCandidate = parseLocalDateTime(date, endTime);
  const endsAt =
    endsAtCandidate && new Date(endsAtCandidate) > new Date(startsAt)
      ? endsAtCandidate
      : addHours(startsAt, 1);

  const { data: event, error: eventError } = await admin
    .from("events")
    .insert({
      provider_id: providerId,
      title,
      description: formString(formData, "description") || null,
      starts_at: startsAt,
      ends_at: endsAt,
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
      refund_policy: refundPolicy,
      refund_partial_pct: refundPartialPct,
      refund_deadline_days: refundDeadlineDays,
      kit_pickup_info: formString(formData, "kitPickupInfo") || null,
    })
    .select("id")
    .single();

  if (eventError || !event) {
    await deleteUploadedEventImages(uploadedImages);
    return fail(eventError?.message ?? "No se pudo crear el evento.");
  }

  const { error: ticketError } = await admin
    .from("provider_event_ticket_types")
    .insert(
      ticketTypes.map((ticket, index) => ({
        provider_id: providerId,
        event_id: event.id,
        name: ticket.name,
        kind: ticket.kind,
        price: ticket.price,
        total: ticket.total,
        active: true,
        sort_order: index,
        // Los tickets gratuitos no tienen ventana: se venden hasta que empieza.
        sale_starts_at: ticket.price > 0 ? ticket.saleStartsAt : null,
        sale_ends_at: ticket.price > 0 ? ticket.saleEndsAt : null,
        donation_enabled: ticket.donationEnabled,
      })),
    );

  if (ticketError) {
    await admin.from("events").delete().eq("id", event.id);
    await deleteUploadedEventImages(uploadedImages);
    return fail(ticketError.message);
  }

  const interestId = await resolveInterestId(admin, category);
  if (interestId) {
    await admin
      .from("event_interests")
      .insert({ event_id: event.id, interest_id: interestId });
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

  return {
    ok: true,
    eventId: event.id,
    title,
    published: status === "published",
  };
}
