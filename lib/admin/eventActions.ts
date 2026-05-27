"use server";

import { logAdminAudit } from "@/lib/admin/auditLog";
import { requireRootActor } from "@/lib/admin/getRootActor";
import { isValidAdminEventStatus, updateAdminEventStatus } from "./eventsApi";
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
