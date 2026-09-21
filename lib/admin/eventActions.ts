"use server";

import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { requireRootActor } from "@/lib/admin/getRootActor";
import {
  isValidAdminEventStatus,
  setAdminEventKitPickup,
  updateAdminEventStatus,
} from "./eventsApi";
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

  // allons-api records the audit row inside the same request, whether the
  // change lands or is refused.
  try {
    await updateAdminEventStatus(id, status, caller);
  } catch (error) {
    throw new Error(
      adminApiErrorMessage(error, "Error cambiando estado del evento"),
    );
  }

  revalidatePath(revalidate);
  revalidatePath("/events");
}

/**
 * Guarda dónde se recoge el kit del evento. Vacío borra el texto: así se dice
 * «este evento no entrega kit» sin necesidad de un interruptor aparte.
 */
export async function setEventKitPickup(formData: FormData) {
  const caller = await requireRootActor();
  const id = String(formData.get("eventId") ?? "");
  const revalidate = String(formData.get("revalidate") ?? "/events");
  const info = String(formData.get("kitPickupInfo") ?? "")
    .trim()
    .slice(0, 2000);

  if (!id) throw new Error("eventId requerido");

  try {
    await setAdminEventKitPickup(id, info, caller);
  } catch (error) {
    throw new Error(
      adminApiErrorMessage(error, "No se pudo guardar el retiro de kit"),
    );
  }

  revalidatePath(revalidate);
  revalidatePath("/events");
}
