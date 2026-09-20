"use server";

import { logAdminAudit } from "@/lib/admin/auditLog";
import { requireRootActor } from "@/lib/admin/getRootActor";
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
  const { error } = await admin
    .from("events")
    .update({ kit_pickup_info: info || null })
    .eq("id", id);

  await logAdminAudit({
    actor_user_id: caller.userId,
    actor_email: caller.email,
    source: "server_action",
    action: "event.kit_pickup_patch",
    resource_type: "event",
    resource_id: id,
    outcome: error ? "failure" : "success",
    // El texto puede traer una dirección; se registra si quedó puesto o vacío,
    // no lo que dice.
    state_after: { has_kit_pickup_info: info.length > 0 },
    error_message: error?.message,
  });

  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
  revalidatePath("/events");
}
