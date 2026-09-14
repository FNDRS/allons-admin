// ---------------------------------------------------------------------
// Commission
//
// Per ticket: Allons % (set per comercio from the relationship) + pasarela
// % (the bank / Clinpays offer). Neither comes from the subscription plan.
// Stored on the owner's auth metadata (`allons_fee_pct`, `paygate_fee_pct`)
// and read by allons-api at sale / refund time.
// ---------------------------------------------------------------------

export type ProviderPlanId = "single_event" | "basico" | "pro";

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

export interface PlanCommission {
  plan: ProviderPlanId;
  /** Display name, es-HN. */
  name: string;
  /** Base app commission for this plan (whole-number percent). */
  baseFee: number;
}

/** Ordered cheapest → most expensive base commission. */
export const PLAN_COMMISSIONS: readonly PlanCommission[] = [
  { plan: "pro", name: "Pro", baseFee: 8 },
  { plan: "basico", name: "Básico", baseFee: 12 },
  { plan: "single_event", name: "Evento Único", baseFee: 15 },
];

/** @deprecated Allons fee is per-comercio (`allons_fee_pct`), not by plan. */
export const TRIAL_BASE_FEE = DEFAULT_ALLONS_FEE;

/** Clamp a fee % from form/metadata. Invalid → fallback. */
export function clampFeePct(
  raw: string | number | null | undefined,
  fallback: number,
): number {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

/** @deprecated Use the stored `allons_fee_pct`. Kept for older rows. */
export function getBaseFeeByPlan(_plan?: string | null): number {
  return DEFAULT_ALLONS_FEE;
}

/** Human label for a plan id (trial/unknown → "Prueba"). */
export function planLabel(plan: string | null | undefined): string {
  return PLAN_COMMISSIONS.find((p) => p.plan === plan)?.name ?? "Prueba";
}

/** Total commission a provider pays = base app commission + pasarela fee. */
export function totalFee(baseFee: number, pasarelaFee: number): number {
  return +(baseFee + pasarelaFee).toFixed(2);
}
