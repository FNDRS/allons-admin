import type { AdminEventFeeOverrides } from "@/lib/admin/eventFeeConfig";
import { FEE_QUOTE_MODES, type FeeQuoteMode } from "@/lib/admin/feeQuote";

/**
 * Lee un campo de porcentaje. Vacío devuelve null, que borra el override y
 * hace que el evento vuelva a usar el valor del comercio. Un 0 es una tarifa
 * real.
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

/** Los cinco overrides que decide el formulario de comisiones. */
export function readEventFeeOverrides(formData: FormData): AdminEventFeeOverrides {
  const rawMode = String(formData.get("feeMode") ?? "").trim();
  if (rawMode !== "" && !FEE_QUOTE_MODES.some((mode) => mode.value === rawMode)) {
    throw new Error(`Modo de cobro inválido: ${rawMode}`);
  }

  const fixedRaw = String(formData.get("gatewayFixedLps") ?? "").trim();
  let gatewayFixedCents: number | null = null;
  if (fixedRaw !== "") {
    const lps = Number(fixedRaw.replace(",", "."));
    const cents = Math.round(lps * 100);
    if (!Number.isFinite(lps) || lps < 0 || !Number.isSafeInteger(cents)) {
      throw new Error("El costo fijo de pasarela debe ser un monto válido");
    }
    gatewayFixedCents = cents;
  }

  return {
    feeMode: rawMode === "" ? null : (rawMode as FeeQuoteMode),
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
}
