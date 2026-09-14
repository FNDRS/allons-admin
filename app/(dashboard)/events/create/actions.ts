"use server";

import {
  normalizeDemoFormFields,
  saveDemoEventForm,
  type DemoEventFormField,
} from "@/lib/demoEventForms";
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

export async function createAdminEventAction(
  _prevState: CreateAdminEventState,
  formData: FormData,
): Promise<CreateAdminEventState> {
  const providerId = formString(formData, "providerId");
  const title = formString(formData, "title");
  const city = formString(formData, "city");
  const date = formString(formData, "date");
  const time = formString(formData, "time");
  const startsAt = parseLocalDateTime(date, time);

  if (!providerId) return fail("Selecciona el comercio.");
  if (!title) return fail("El título es obligatorio.");
  if (!city) return fail("La ciudad es obligatoria para publicar en la app.");
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

  if (formFields === null) {
    return fail("El formulario personalizado no tiene un formato válido.");
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
      venue: formString(formData, "venue") || null,
      address: formString(formData, "address") || null,
      capacity,
      status,
      event_type: "single",
      ticket_mode: ticketMode,
      theme_color: themeColor,
      cover_image_url: formString(formData, "coverImageUrl") || null,
      refund_policy: "none",
    })
    .select("id")
    .single();

  if (eventError || !event) {
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
    return fail(ticketError.message);
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
