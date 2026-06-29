// ---------------------------------------------------------------------
// Commission tiers
//
// Allons charges providers a volume-based commission per ticket sold.
// The base app commission shrinks as a provider runs more events per
// month. On top of it sits a per-comercio payment-gateway ("pasarela")
// fee negotiated with Clinpays + the bank by business type (e.g. an NGO
// gets a lower rate than a tech company), set here in admin and passed
// through to the gateway (not Allons revenue). Percentages are whole
// numbers (e.g. 8 = 8%).
//
// Mirrors `commission-tiers.ts` in allons-api and `lib/commissionTiers.ts`
// in allons-mobile. The effective fee withheld from a sale is
// `getTierByEvents(eventsThisMonth).baseFee + pasarelaFee`, computed by the
// API at runtime.
// ---------------------------------------------------------------------

export type CommissionLevel = "platino" | "oro" | "plata" | "base";

/** Fallback pasarela fee (%) when a comercio has no negotiated rate set. */
export const DEFAULT_PASARELA_FEE = 5;

/** Suggested pasarela rate (%) per business type, before the bank contract. */
export const PASARELA_FEE_BY_BUSINESS_TYPE: Record<string, number> = {
  ong: 2,
  tecnologia: 7,
  empresa: 5,
  otro: 5,
};

export interface CommissionTier {
  level: CommissionLevel;
  /** Display name, es-HN. */
  name: string;
  /** Human description of the monthly-event volume that earns this tier. */
  eventsLabel: string;
  /** Whether the tier targets recurring organizers. */
  recurrente: string;
  /** Base app commission for this tier (whole-number percent). */
  baseFee: number;
}

/** Ordered best → worst (lowest → highest commission). */
export const COMMISSION_TIERS: readonly CommissionTier[] = [
  {
    level: "platino",
    name: "Platino",
    eventsLabel: "Más de 8 eventos / mes",
    recurrente: "Sí",
    baseFee: 8,
  },
  {
    level: "oro",
    name: "Oro",
    eventsLabel: "4 a 8 eventos / mes",
    recurrente: "Sí / No",
    baseFee: 10,
  },
  {
    level: "plata",
    name: "Plata",
    eventsLabel: "2 a 3 eventos / mes",
    recurrente: "Cualquiera",
    baseFee: 12,
  },
  {
    level: "base",
    name: "Base / Esporádico",
    eventsLabel: "1 evento o menos / mes",
    recurrente: "No",
    baseFee: 15,
  },
];

/** Total commission a provider pays = base app commission + pasarela fee. */
export function totalFee(baseFee: number, pasarelaFee: number): number {
  return +(baseFee + pasarelaFee).toFixed(2);
}

/** Tier earned by a given monthly event volume. */
export function getTierByEvents(eventsPerMonth: number): CommissionTier {
  if (eventsPerMonth > 8) return COMMISSION_TIERS[0];
  if (eventsPerMonth >= 4) return COMMISSION_TIERS[1];
  if (eventsPerMonth >= 2) return COMMISSION_TIERS[2];
  return COMMISSION_TIERS[3];
}
