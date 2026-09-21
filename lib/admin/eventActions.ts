"use server";

import { logAdminAudit } from "@/lib/admin/auditLog";
import { requireRootActor } from "@/lib/admin/getRootActor";
import { checkTicketType } from "@/lib/admin/ticketTypeRules";
import { isValidAdminEventStatus, updateAdminEventStatus } from "./eventsApi";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UpdateEventTicketTypeState =
  | { ok: false; errors: string[]; warnings: string[] }
  | { ok: true; warnings: string[]; resultId: string }
  | null;

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
export async function updateEventTicketType(
  _prevState: UpdateEventTicketTypeState,
  formData: FormData,
): Promise<UpdateEventTicketTypeState> {
  const caller = await requireRootActor();
  const id = String(formData.get("ticketTypeId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const revalidate = String(formData.get("revalidate") ?? "/events");

  if (!id) return failTicketTypeUpdate("ticketTypeId requerido");
  if (!eventId) return failTicketTypeUpdate("eventId requerido");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const price = formNumber(formData.get("price"));
  const priceCents = Number.isFinite(price) ? Math.round(price * 100) : Number.NaN;
  const total = formInteger(formData.get("total"));
  const active = String(formData.get("active") ?? "") === "on";
  const paid = priceCents > 0;
  const saleStartsAt = paid ? formOptionalText(formData.get("saleStartsAt")) : null;
  const saleEndsAt = paid ? formOptionalText(formData.get("saleEndsAt")) : null;

  const admin = createSupabaseServiceRoleClient();

  // Se lee el estado actual antes de validar: el cupo mínimo depende de lo ya
  // vendido y el aviso de precio, de lo que costaba hasta ahora.
  const { data: current, error: readError } = await admin
    .from("provider_event_ticket_types")
    .select("id, price, sold_count, event_id")
    .eq("id", id)
    .eq("event_id", eventId)
    .maybeSingle();

  if (readError) {
    await auditTicketTypeUpdateFailure({
      caller,
      ticketTypeId: id,
      eventId,
      errorMessage: readError.message,
    });
    return failTicketTypeUpdate(readError.message);
  }
  if (!current) {
    await auditTicketTypeUpdateFailure({
      caller,
      ticketTypeId: id,
      eventId,
      errorMessage: "Tipo de entrada no encontrado",
    });
    return failTicketTypeUpdate("Tipo de entrada no encontrado");
  }

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("starts_at")
    .eq("id", eventId)
    .maybeSingle();

  if (eventError) {
    await auditTicketTypeUpdateFailure({
      caller,
      ticketTypeId: id,
      eventId,
      errorMessage: eventError.message,
    });
    return failTicketTypeUpdate(eventError.message);
  }
  if (!event) {
    await auditTicketTypeUpdateFailure({
      caller,
      ticketTypeId: id,
      eventId,
      errorMessage: "Evento no encontrado",
    });
    return failTicketTypeUpdate("Evento no encontrado");
  }

  const eventDayEnd = endOfEventDay(event.starts_at ?? null);
  if (paid && !eventDayEnd) {
    await auditTicketTypeUpdateFailure({
      caller,
      ticketTypeId: id,
      eventId,
      errorMessage: "No se pudo leer la fecha del evento.",
    });
    return failTicketTypeUpdate("No se pudo leer la fecha del evento.");
  }

  const check = checkTicketType(
    { name, priceCents, total, active, saleStartsAt, saleEndsAt },
    {
      soldCount: Number(current.sold_count ?? 0),
      currentPriceCents: Math.round(Number(current.price ?? 0) * 100),
      eventDayEnd,
    },
  );

  if (check.errors.length > 0) {
    await auditTicketTypeUpdateFailure({
      caller,
      ticketTypeId: id,
      eventId,
      errorMessage: check.errors.join(" "),
      rejected: check.errors.length,
    });
    return { ok: false, errors: check.errors, warnings: check.warnings };
  }

  const stateAfter = {
    event_id: eventId,
    price_cents: priceCents,
    total,
    active,
    has_sale_window: Boolean(saleStartsAt && saleEndsAt),
    warnings: check.warnings.length,
  };

  const { data: updated, error } = await admin
    .from("provider_event_ticket_types")
    .update({
      name,
      price: priceCents / 100,
      total,
      active,
      sale_starts_at: optionalIso(saleStartsAt),
      sale_ends_at: optionalIso(saleEndsAt),
    })
    .eq("id", id)
    .eq("event_id", eventId)
    .select("id")
    .maybeSingle();

  const missing = !error && !updated;

  if (error) {
    await auditTicketTypeUpdateFailure({
      caller,
      ticketTypeId: id,
      eventId,
      errorMessage: error.message,
      stateAfter,
    });
    return { ok: false, errors: [error.message], warnings: check.warnings };
  }
  if (missing) {
    await auditTicketTypeUpdateFailure({
      caller,
      ticketTypeId: id,
      eventId,
      errorMessage: "tipo de entrada no encontrado",
      stateAfter,
    });
    return {
      ok: false,
      errors: ["Tipo de entrada no encontrado"],
      warnings: check.warnings,
    };
  }

  await logAdminAudit({
    actor_user_id: caller.userId,
    actor_email: caller.email,
    source: "server_action",
    action: "event.ticket_type_patch",
    resource_type: "provider_event_ticket_type",
    resource_id: id,
    outcome: "success",
    // El precio y el cupo son justamente lo que hay que poder auditar después.
    state_after: stateAfter,
  });

  revalidatePath(revalidate);
  revalidatePath("/events");
  return {
    ok: true,
    warnings: check.warnings,
    resultId: `${Date.now()}-${id}`,
  };
}

function formOptionalText(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  return raw || null;
}

function formNumber(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;
  return Number(raw);
}

function formInteger(value: FormDataEntryValue | null): number {
  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;
  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function optionalIso(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
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

function failTicketTypeUpdate(error: string): UpdateEventTicketTypeState {
  return { ok: false, errors: [error], warnings: [] };
}

async function auditTicketTypeUpdateFailure({
  caller,
  ticketTypeId,
  eventId,
  errorMessage,
  rejected,
  stateAfter,
}: {
  caller: Awaited<ReturnType<typeof requireRootActor>>;
  ticketTypeId: string;
  eventId: string;
  errorMessage: string;
  rejected?: number;
  stateAfter?: Record<string, unknown>;
}) {
  await logAdminAudit({
    actor_user_id: caller.userId,
    actor_email: caller.email,
    source: "server_action",
    action: "event.ticket_type_patch",
    resource_type: "provider_event_ticket_type",
    resource_id: ticketTypeId,
    outcome: "failure",
    state_after: {
      event_id: eventId,
      ...(stateAfter ?? {}),
      ...(typeof rejected === "number" ? { rejected } : {}),
    },
    error_message: errorMessage,
  });
}
