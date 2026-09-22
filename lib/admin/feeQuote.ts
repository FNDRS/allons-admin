/**
 * Same split as `quoteTicket` in allons-api (`gateway-pricing.ts`).
 *
 * The panel recomputes it as the form changes so the breakdown matches the
 * option on screen. If this drifts from that function, the preview lies.
 */

export type FeeQuoteMode =
  | "provider_absorbs"
  | "buyer_pays_gateway"
  | "buyer_pays_all";

export const FEE_QUOTE_MODES: ReadonlyArray<{
  value: FeeQuoteMode;
  label: string;
  hint: string;
}> = [
  {
    value: "provider_absorbs",
    label: "El comercio absorbe todo",
    hint: "El comprador paga el precio publicado. Al comercio se le descuentan la comisión y la pasarela.",
  },
  {
    value: "buyer_pays_gateway",
    label: "El comprador paga la pasarela",
    hint: "Se suma un cargo por servicio al precio. Al comercio solo se le descuenta la comisión de Allons.",
  },
  {
    value: "buyer_pays_all",
    label: "El comprador paga todo",
    hint: "El comercio recibe el precio del boleto íntegro. El comprador cubre la pasarela y la comisión.",
  },
];

export interface FeeQuoteInput {
  feeMode: FeeQuoteMode;
  subtotalCents: number;
  gatewayRatePct: number;
  gatewayFixedCents: number;
  allonsFeePct: number;
  isvPct: number;
}

export interface FeeQuote {
  subtotalCents: number;
  serviceChargeCents: number;
  totalCents: number;
  gatewayCostCents: number;
  allonsFeeCents: number;
  isvCents: number;
  providerNetCents: number;
}

const MAX_GATEWAY_RATE_PCT = 99;

function clampPct(value: number, max = 100): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(max, value);
}

function rateOf(gatewayRatePct: number): number {
  return clampPct(gatewayRatePct, MAX_GATEWAY_RATE_PCT) / 100;
}

function gatewayCost(totalCents: number, input: FeeQuoteInput): number {
  if (totalCents <= 0) return 0;
  return (
    Math.round(totalCents * rateOf(input.gatewayRatePct)) +
    Math.max(0, Math.round(input.gatewayFixedCents))
  );
}

function chargeCoveringGateway(
  subtotalCents: number,
  input: FeeQuoteInput,
): number {
  const rate = rateOf(input.gatewayRatePct);
  return Math.ceil(
    (subtotalCents * rate + Math.max(0, input.gatewayFixedCents)) / (1 - rate),
  );
}

function chargeCoveringAll(
  subtotalCents: number,
  platformFeeCents: number,
  input: FeeQuoteInput,
): number {
  const rate = rateOf(input.gatewayRatePct);
  const total = Math.ceil(
    (subtotalCents +
      Math.max(0, input.gatewayFixedCents) +
      platformFeeCents) /
      (1 - rate),
  );
  return total - subtotalCents;
}

export function quoteTicketFees(input: FeeQuoteInput): FeeQuote {
  const subtotal = Math.max(0, Math.round(input.subtotalCents));
  if (subtotal === 0) {
    return {
      subtotalCents: 0,
      serviceChargeCents: 0,
      totalCents: 0,
      gatewayCostCents: 0,
      allonsFeeCents: 0,
      isvCents: 0,
      providerNetCents: 0,
    };
  }

  const allonsFee = Math.round((subtotal * clampPct(input.allonsFeePct)) / 100);
  const isv = Math.round((allonsFee * clampPct(input.isvPct)) / 100);
  const platformFee = allonsFee + isv;

  const serviceCharge =
    input.feeMode === "provider_absorbs"
      ? 0
      : input.feeMode === "buyer_pays_gateway"
        ? chargeCoveringGateway(subtotal, input)
        : chargeCoveringAll(subtotal, platformFee, input);

  const total = subtotal + serviceCharge;
  const cost = gatewayCost(total, input);
  const providerNet =
    input.feeMode === "provider_absorbs"
      ? subtotal - platformFee - cost
      : input.feeMode === "buyer_pays_gateway"
        ? subtotal - platformFee
        : total - cost - platformFee;

  return {
    subtotalCents: subtotal,
    serviceChargeCents: serviceCharge,
    totalCents: total,
    gatewayCostCents: cost,
    allonsFeeCents: allonsFee,
    isvCents: isv,
    providerNetCents: providerNet,
  };
}
