import type { FeeQuoteMode } from "@/lib/admin/feeQuote";

/** Overrides del evento. Null en cualquiera significa «usar el del comercio». */
export interface AdminEventFeeOverrides {
  feeMode: FeeQuoteMode | null;
  allonsFeePct: number | null;
  gatewayFeePct: number | null;
  gatewayFixedCents: number | null;
  isvPct: number | null;
}

/** Desglose de un boleto de muestra, calculado por la API. */
export interface AdminEventFeeQuote {
  feeMode: FeeQuoteMode;
  subtotalCents: number;
  serviceChargeCents: number;
  totalCents: number;
  gatewayCostCents: number;
  allonsFeeCents: number;
  isvCents: number;
  providerNetCents: number;
  roundingCents: number;
}

export interface AdminEventFeeConfig {
  eventId: string;
  /** False mientras el cobro real no lea esta configuración. */
  appliesToCheckout?: boolean;
  overrides: AdminEventFeeOverrides;
  providerDefaults: { allonsFee: number; pasarelaFee: number };
  effective: {
    feeMode: FeeQuoteMode;
    allonsFeePct: number;
    gatewayRatePct: number;
    gatewayFixedCents: number;
    isvPct: number;
  };
  preview: AdminEventFeeQuote;
}
