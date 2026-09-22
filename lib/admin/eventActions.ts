"use server";

import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { requireRootActor } from "@/lib/admin/getRootActor";
import type { TicketTypeSaveState } from "@/lib/admin/ticketTypeSaveState";
import { readEventFeeOverrides } from "@/lib/admin/eventFeeForm";
import {
  isValidAdminEventStatus,
  setAdminEventFees,
  patchAdminEventTicketType,
  setAdminEventKitPickup,
  updateAdminEventStatus,
} from "./eventsApi";
import { hondurasInputToIso } from "@/lib/hondurasDateTime";
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

/**
 * Guarda la configuración de comisiones de un evento.
 *
 * Estos cinco valores deciden cuánto paga cada comprador del evento y cuánto
 * recibe el comercio, así que la API los audita completos.
 */
export async function setEventFees(formData: FormData) {
  const caller = await requireRootActor();
  const id = String(formData.get("eventId") ?? "");
  if (!id) throw new Error("eventId requerido");

  const overrides = readEventFeeOverrides(formData);

  try {
    await setAdminEventFees(id, overrides, caller);
  } catch (error) {
    throw new Error(
      adminApiErrorMessage(error, "No se pudieron guardar las comisiones"),
    );
  }

  revalidatePath(`/events/${id}`);
  revalidatePath("/events");
}

/**
 * Edita un tipo de entrada. Las reglas viven en allons-api, que también deja
 * la fila de auditoría; acá sólo se arma el cuerpo y se muestra lo que
 * responde. Duplicar las validaciones en el panel garantizaba que un día
 * dijeran cosas distintas.
 *
 * Devuelve el resultado en vez de lanzar: el rechazo y los avisos tienen que
 * poder leerse en la fila, no terminar en la pantalla de error de Next.
 */
export async function updateEventTicketType(
  _prev: TicketTypeSaveState,
  formData: FormData,
): Promise<TicketTypeSaveState> {
  const caller = await requireRootActor();
  const eventId = String(formData.get("eventId") ?? "");
  const ticketTypeId = String(formData.get("ticketTypeId") ?? "");
  const revalidate = String(formData.get("revalidate") ?? "/events");

  if (!eventId || !ticketTypeId) {
    return { ok: false, error: "Falta el evento o el tipo de entrada.", warnings: [] };
  }

  const price = Number(formData.get("price"));
  const total = Number(formData.get("total"));
  if (!Number.isFinite(price) || !Number.isFinite(total)) {
    return { ok: false, error: "El precio y el cupo tienen que ser números.", warnings: [] };
  }

  try {
    const result = await patchAdminEventTicketType(
      eventId,
      ticketTypeId,
      {
        name: String(formData.get("name") ?? "").trim(),
        priceCents: Math.round(price * 100),
        total: Math.round(total),
        active: String(formData.get("active") ?? "") === "on",
        saleStartsAt: localInputToIso(formData.get("saleStartsAt")),
        saleEndsAt: localInputToIso(formData.get("saleEndsAt")),
      },
      caller,
    );

    revalidatePath(revalidate);
    revalidatePath("/events");
    return { ok: true, error: null, warnings: result.warnings ?? [] };
  } catch (error) {
    return {
      ok: false,
      error: adminApiErrorMessage(error, "Error guardando el tipo de entrada"),
      warnings: [],
    };
  }
}

/**
 * El panel manda `YYYY-MM-DDTHH:mm` en hora de Honduras, sin zona.
 */
function localInputToIso(value: FormDataEntryValue | null): string | null {
  return hondurasInputToIso(String(value ?? ""));
}
