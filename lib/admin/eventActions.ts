"use server";

import { logAdminAudit } from "@/lib/admin/auditLog";
import { requireRootActor } from "@/lib/admin/getRootActor";
import { checkTicketType } from "@/lib/admin/ticketTypeRules";
import { isValidAdminEventStatus, updateAdminEventStatus } from "./eventsApi";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function setEventStatus(formData: FormData) {
  const caller = await requireRootActor();
  const id = String(formData.get("eventId") ?? "");
  const status = String(formData.get("status") ?? "");
  const revalidate = String(formData.get("revalidate") ?? "/events");

  if (!id) throw new Error("eventId requerido");
  if (!isValidAdminEventStatus(status)) {
    throw new Error(`status inválido: ${status}`);
  }

  try {
    await updateAdminEventStatus(id, status);
    await logAdminAudit({
      actor_user_id: caller.userId,
      actor_email: caller.email,
      source: "server_action",
      action: "event.status_patch",
      resource_type: "event",
      resource_id: id,
      outcome: "success",
      state_after: { status },
    });
    revalidatePath(revalidate);
    revalidatePath("/events");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Error cambiando estado del evento";
    await logAdminAudit({
      actor_user_id: caller.userId,
      actor_email: caller.email,
      source: "server_action",
      action: "event.status_patch",
      resource_type: "event",
      resource_id: id,
      outcome: "failure",
      state_after: { status_attempted: status },
      error_message: message,
    });
    throw err;
  }
}

/**
 * Guarda dónde se recoge el kit del evento.
 *
 * Escribe directo contra la tabla, igual que la creación de eventos del panel:
 * es el mismo dato y el mismo actor, y pasar por la API sólo agregaría un salto
 * más sin agregar ninguna regla.
 */
export async function setEventKitPickup(formData: FormData) {
  const caller = await requireRootActor();
  const id = String(formData.get("eventId") ?? "");
  const revalidate = String(formData.get("revalidate") ?? "/events");
  // Vacío borra el texto: así se dice «este evento no entrega kit» sin
  // necesidad de un interruptor aparte.
  const info = String(formData.get("kitPickupInfo") ?? "")
    .trim()
    .slice(0, 2000);

  if (!id) throw new Error("eventId requerido");

  const admin = createSupabaseServiceRoleClient();
  // `update().eq()` no falla cuando el id no existe: sin pedir la fila de
  // vuelta, un evento borrado o un id inventado quedarían auditados como un
  // guardado exitoso que no cambió nada.
  const { data: updated, error } = await admin
    .from("events")
    .update({ kit_pickup_info: info || null })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  const missing = !error && !updated;

  await logAdminAudit({
    actor_user_id: caller.userId,
    actor_email: caller.email,
    source: "server_action",
    action: "event.kit_pickup_patch",
    resource_type: "event",
    resource_id: id,
    outcome: error || missing ? "failure" : "success",
    // El texto puede traer una dirección; se registra si quedó puesto o vacío,
    // no lo que dice. Si no se guardó, va como intento: el estado posterior
    // del evento es el viejo, no el que se mandó.
    state_after:
      error || missing
        ? { has_kit_pickup_info_attempted: info.length > 0 }
        : { has_kit_pickup_info: info.length > 0 },
    error_message:
      error?.message ?? (missing ? "evento no encontrado" : undefined),
  });

  if (error) throw new Error(error.message);
  if (missing) throw new Error("Evento no encontrado");

  revalidatePath(revalidate);
  revalidatePath("/events");
}

/**
 * Edita un tipo de entrada desde el detalle del evento.
 *
 * Vive aquí porque el precio, el cupo y la ventana de venta cambian después de
 * publicar —se agota un tier, se corre la fecha, se corrige un precio mal
 * cargado— y hasta ahora la única salida era tocar la base a mano.
 */
export async function updateEventTicketType(formData: FormData) {
  const caller = await requireRootActor();
  const id = String(formData.get("ticketTypeId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const revalidate = String(formData.get("revalidate") ?? "/events");

  if (!id) throw new Error("ticketTypeId requerido");
  if (!eventId) throw new Error("eventId requerido");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const priceCents = Math.round(Number(formData.get("price") ?? 0) * 100);
  const total = Number(formData.get("total") ?? 0);
  const active = String(formData.get("active") ?? "") === "on";
  const saleStartsAt = emptyToNull(formData.get("saleStartsAt"));
  const saleEndsAt = emptyToNull(formData.get("saleEndsAt"));

  const admin = createSupabaseServiceRoleClient();

  // Se lee el estado actual antes de validar: el cupo mínimo depende de lo ya
  // vendido y el aviso de precio, de lo que costaba hasta ahora.
  const { data: current, error: readError } = await admin
    .from("provider_event_ticket_types")
    .select("id, price, sold_count, event_id")
    .eq("id", id)
    .eq("event_id", eventId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);
  if (!current) throw new Error("Tipo de entrada no encontrado");

  const { data: event } = await admin
    .from("events")
    .select("starts_at")
    .eq("id", eventId)
    .maybeSingle();

  const check = checkTicketType(
    { name, priceCents, total, active, saleStartsAt, saleEndsAt },
    {
      soldCount: Number(current.sold_count ?? 0),
      currentPriceCents: Math.round(Number(current.price ?? 0) * 100),
      eventDayEnd: endOfEventDay(event?.starts_at ?? null),
    },
  );

  if (check.errors.length > 0) {
    await logAdminAudit({
      actor_user_id: caller.userId,
      actor_email: caller.email,
      source: "server_action",
      action: "event.ticket_type_patch",
      resource_type: "provider_event_ticket_type",
      resource_id: id,
      outcome: "failure",
      state_after: { event_id: eventId, rejected: check.errors.length },
      error_message: check.errors.join(" "),
    });
    throw new Error(check.errors.join(" "));
  }

  const { data: updated, error } = await admin
    .from("provider_event_ticket_types")
    .update({
      name,
      price: priceCents / 100,
      total,
      active,
      sale_starts_at: saleStartsAt,
      sale_ends_at: saleEndsAt,
    })
    .eq("id", id)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();

  const missing = !error && !updated;

  await logAdminAudit({
    actor_user_id: caller.userId,
    actor_email: caller.email,
    source: "server_action",
    action: "event.ticket_type_patch",
    resource_type: "provider_event_ticket_type",
    resource_id: id,
    outcome: error || missing ? "failure" : "success",
    // El precio y el cupo son justamente lo que hay que poder auditar después.
    state_after: {
      event_id: eventId,
      price_cents: priceCents,
      total,
      active,
      has_sale_window: Boolean(saleStartsAt && saleEndsAt),
      warnings: check.warnings.length,
    },
    error_message:
      error?.message ?? (missing ? "tipo de entrada no encontrado" : undefined),
  });

  if (error) throw new Error(error.message);
  if (missing) throw new Error("Tipo de entrada no encontrado");

  revalidatePath(revalidate);
  revalidatePath("/events");
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  return raw ? new Date(raw).toISOString() : null;
}

/**
 * Fin del día del evento en hora local. La venta no puede pasar de ahí, que es
 * la misma regla que aplica la API al crear el tier.
 */
function endOfEventDay(startsAt: string | null): Date | null {
  if (!startsAt) return null;
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    23,
    59,
    59,
    999,
  );
}
