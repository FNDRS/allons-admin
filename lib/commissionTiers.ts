// ---------------------------------------------------------------------
// Commission
//
// Per ticket: Allons % (set per comercio from the relationship) + pasarela
// % (the bank / Clinpays offer).
// Stored on the owner's auth metadata (`allons_fee_pct`, `paygate_fee_pct`)
// and read by allons-api at sale / refund time.
// ---------------------------------------------------------------------

/** Fallback Allons commission (%) when a comercio has no negotiated rate. */
export const DEFAULT_ALLONS_FEE = 8;

/** Fallback pasarela fee (%) when a comercio has no negotiated rate set. */
export const DEFAULT_PASARELA_FEE = 5;

/** Suggested pasarela rate (%) per business type, before the bank contract. */
export const PASARELA_FEE_BY_BUSINESS_TYPE: Record<string, number> = {
  ong: 2,
  tecnologia: 7,
  empresa: 5,
  otro: 5,
};

/** Clamp a fee % from form/metadata. Invalid → fallback. */
export function clampFeePct(
  raw: string | number | null | undefined,
  fallback: number,
): number {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

/** Total commission a provider pays = base app commission + pasarela fee. */
export function totalFee(baseFee: number, pasarelaFee: number): number {
  return +(baseFee + pasarelaFee).toFixed(2);
}
