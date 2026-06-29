// ---------------------------------------------------------------------
// Commission by plan
//
// Allons charges providers a base app commission per ticket sold, tied to
// their subscription plan: the higher-volume plans pay a lower base
// (Pro 8% < Básico 12% < Evento Único 15%; trial 12%). On top of it sits a
// per-comercio payment-gateway ("pasarela") fee negotiated with Clinpays +
// the bank by business type, set here in admin and passed through to the
// gateway (not Allons revenue). Percentages are whole numbers (e.g. 8 = 8%).
//
// Mirrors `commission-tiers.ts` in allons-api and `lib/commissionTiers.ts`
// in allons-mobile. The effective fee withheld from a sale is
// `getBaseFeeByPlan(plan) + pasarelaFee`, computed by the API at runtime.
// ---------------------------------------------------------------------

export type ProviderPlanId = "single_event" | "basico" | "pro";

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

/** Base app commission (%) during the free trial (no plan chosen yet). */
export const TRIAL_BASE_FEE = 12;

/** Base app commission % for a subscription plan. Trial/unknown → trial rate. */
export function getBaseFeeByPlan(plan: string | null | undefined): number {
  return (
    PLAN_COMMISSIONS.find((p) => p.plan === plan)?.baseFee ?? TRIAL_BASE_FEE
  );
}

/** Human label for a plan id (trial/unknown → "Prueba"). */
export function planLabel(plan: string | null | undefined): string {
  return PLAN_COMMISSIONS.find((p) => p.plan === plan)?.name ?? "Prueba";
}

/** Total commission a provider pays = base app commission + pasarela fee. */
export function totalFee(baseFee: number, pasarelaFee: number): number {
  return +(baseFee + pasarelaFee).toFixed(2);
}
