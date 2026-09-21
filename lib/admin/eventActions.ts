"use server";

import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { requireRootActor } from "@/lib/admin/getRootActor";
import {
  ADMIN_FEE_MODES,
  isValidAdminEventStatus,
  setAdminEventFees,
  setAdminEventKitPickup,
  updateAdminEventStatus,
  type AdminEventFeeOverrides,
  type AdminFeeMode,
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

/**
 * Lee un campo de porcentaje del formulario. Vacío devuelve null, que borra el
 * override y hace que el evento vuelva a usar el valor del comercio; hay que
 * distinguirlo de un 0, que es una tarifa real para un comercio que no paga.
 */
function optionalNumber(
  raw: FormDataEntryValue | null,
  max: number,
  label: string,
) {
  const text = String(raw ?? "").trim();
  if (text === "") return null;
  const value = Number(text.replace(",", "."));
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new Error(`${label} debe estar entre 0 y ${max}`);
  }
  return value;
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

  const rawMode = String(formData.get("feeMode") ?? "").trim();
  if (rawMode !== "" && !ADMIN_FEE_MODES.some((m) => m.value === rawMode)) {
    throw new Error(`Modo de cobro inválido: ${rawMode}`);
  }

  const fixedRaw = String(formData.get("gatewayFixedLps") ?? "").trim();
  let gatewayFixedCents: number | null = null;
  if (fixedRaw !== "") {
    const lps = Number(fixedRaw.replace(",", "."));
    const cents = Math.round(lps * 100);
    // Checked after the conversion, not before: 1e308 is finite but its cents
    // are Infinity, which serializes to JSON null and would clear the override
    // instead of setting it.
    if (!Number.isFinite(lps) || lps < 0 || !Number.isSafeInteger(cents)) {
      throw new Error("El costo fijo de pasarela debe ser un monto válido");
    }
    gatewayFixedCents = cents;
  }

  const overrides: AdminEventFeeOverrides = {
    feeMode: rawMode === "" ? null : (rawMode as AdminFeeMode),
    allonsFeePct: optionalNumber(
      formData.get("allonsFeePct"),
      100,
      "La comisión de Allons",
    ),
    gatewayFeePct: optionalNumber(
      formData.get("gatewayFeePct"),
      99,
      "La comisión de pasarela",
    ),
    gatewayFixedCents,
    isvPct: optionalNumber(formData.get("isvPct"), 100, "El ISV"),
  };

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
