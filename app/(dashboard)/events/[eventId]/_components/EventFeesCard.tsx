"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioItem } from "@/components/ui/radio-group";
import { setEventFees } from "@/lib/admin/eventActions";
import {
  FEE_QUOTE_MODES,
  quoteTicketFees,
  type FeeQuoteMode,
} from "@/lib/admin/feeQuote";
import type { AdminEventFeeConfig } from "@/lib/admin/eventFeeConfig";

const DEFAULT_GATEWAY_FIXED_CENTS = 390;

const lps = (cents: number) =>
  `L ${(cents / 100).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function parseAmount(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const n = Number.parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function isFeeMode(value: string): value is FeeQuoteMode {
  return FEE_QUOTE_MODES.some((mode) => mode.value === value);
}

/**
 * Configura las comisiones de un evento.
 *
 * El desglose se recalcula con cada opción y cada número, con la misma
 * fórmula del checkout. Guardar es lo que persiste; la vista no espera a eso.
 */
export function EventFeesCard({
  eventId,
  config,
  hasPricedTicket,
}: {
  eventId: string;
  config: AdminEventFeeConfig;
  /** False when the event sells nothing, so the preview is a sample amount. */
  hasPricedTicket: boolean;
}) {
  const { overrides, providerDefaults, preview } = config;
  const [feeMode, setFeeMode] = useState(overrides.feeMode ?? "");
  const [allonsFee, setAllonsFee] = useState(
    overrides.allonsFeePct === null ? "" : String(overrides.allonsFeePct),
  );
  const [gatewayFee, setGatewayFee] = useState(
    overrides.gatewayFeePct === null ? "" : String(overrides.gatewayFeePct),
  );
  const [gatewayFixed, setGatewayFixed] = useState(
    overrides.gatewayFixedCents === null
      ? ""
      : (overrides.gatewayFixedCents / 100).toFixed(2),
  );
  const [isv, setIsv] = useState(
    overrides.isvPct === null ? "" : String(overrides.isvPct),
  );

  const quote = useMemo(() => {
    const mode: FeeQuoteMode = isFeeMode(feeMode)
      ? feeMode
      : "provider_absorbs";
    return quoteTicketFees({
      feeMode: mode,
      subtotalCents: preview.subtotalCents,
      allonsFeePct: parseAmount(allonsFee, providerDefaults.allonsFee),
      gatewayRatePct: parseAmount(gatewayFee, providerDefaults.pasarelaFee),
      gatewayFixedCents: Math.round(
        parseAmount(gatewayFixed, DEFAULT_GATEWAY_FIXED_CENTS / 100) * 100,
      ),
      isvPct: parseAmount(isv, 0),
    });
  }, [
    feeMode,
    allonsFee,
    gatewayFee,
    gatewayFixed,
    isv,
    preview.subtotalCents,
    providerDefaults.allonsFee,
    providerDefaults.pasarelaFee,
  ]);

  return (
    <section className="futuristic-panel p-5">
      <div className="eyebrow">Comisiones</div>
      <h2 className="mt-1 text-xl font-semibold">Cobros de este evento</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
        Deja un campo vacío para usar el valor del comercio. El desglose usa la
        misma fórmula del checkout y cambia con la opción que elijas.
      </p>

      {config.appliesToCheckout === false && (
        <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm leading-6 text-amber-200/90">
          Todavía no está conectado al cobro. Guardar aquí deja la configuración
          lista y cambia este desglose, pero el comprador sigue pagando como
          hasta ahora hasta que se libere el cambio en la app.
        </p>
      )}

      <form action={setEventFees} className="mt-5 space-y-5">
        <input type="hidden" name="eventId" value={eventId} />

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            Quién paga cada comisión
          </legend>
          <RadioGroup
            name="feeMode"
            value={feeMode}
            onValueChange={setFeeMode}
          >
            {FEE_QUOTE_MODES.map((mode) => (
              <RadioItem
                key={mode.value}
                value={mode.value}
                className="h-auto items-start rounded-lg border-white/10 py-3 normal-case tracking-normal aria-checked:border-white/40 aria-checked:bg-white/[0.06]"
              >
                <span>
                  <span className="block text-sm font-medium">{mode.label}</span>
                  <span className="block text-xs leading-5 text-white/50">
                    {mode.hint}
                  </span>
                </span>
              </RadioItem>
            ))}
            <RadioItem
              value=""
              className="h-auto rounded-lg border-dashed border-white/15 py-3 font-normal normal-case tracking-normal text-white/50 aria-checked:border-white/40 aria-checked:bg-white/[0.06]"
            >
              Usar el valor del comercio
            </RadioItem>
          </RadioGroup>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="event-allons-fee">Comisión Allons (%)</Label>
            <Input
              id="event-allons-fee"
              name="allonsFeePct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={allonsFee}
              onChange={(event) => setAllonsFee(event.target.value)}
              placeholder={`Comercio: ${providerDefaults.allonsFee}%`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-gateway-fee">Comisión pasarela (%)</Label>
            <Input
              id="event-gateway-fee"
              name="gatewayFeePct"
              type="number"
              step="0.01"
              min="0"
              max="99"
              value={gatewayFee}
              onChange={(event) => setGatewayFee(event.target.value)}
              placeholder={`Comercio: ${providerDefaults.pasarelaFee}%`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-gateway-fixed">
              Costo fijo de pasarela (L)
            </Label>
            <Input
              id="event-gateway-fixed"
              name="gatewayFixedLps"
              type="number"
              step="0.01"
              min="0"
              value={gatewayFixed}
              onChange={(event) => setGatewayFixed(event.target.value)}
              placeholder="Por defecto: 3.90"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-isv">ISV sobre la comisión (%)</Label>
            <Input
              id="event-isv"
              name="isvPct"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={isv}
              onChange={(event) => setIsv(event.target.value)}
              placeholder="Por defecto: 0"
            />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/3 p-4">
          <div className="text-xs uppercase tracking-wide text-white/40">
            {hasPricedTicket
              ? `Desglose de un boleto de ${lps(quote.subtotalCents)}`
              : `Ejemplo sobre ${lps(quote.subtotalCents)}`}
          </div>
          {!hasPricedTicket && (
            <p className="mt-2 text-xs leading-5 text-white/40">
              Este evento no tiene boletos de pago, así que el desglose usa un
              monto de muestra. El cargo por servicio no es un porcentaje fijo:
              cambia con el precio.
            </p>
          )}
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Precio del boleto" value={lps(quote.subtotalCents)} />
            {quote.serviceChargeCents > 0 && (
              <Row
                label="Cargo por servicio"
                value={`+ ${lps(quote.serviceChargeCents)}`}
              />
            )}
            <Row
              label="Paga el comprador"
              value={lps(quote.totalCents)}
              strong
            />
            <Row
              label="Se lleva la pasarela"
              value={`− ${lps(quote.gatewayCostCents)}`}
            />
            <Row
              label="Comisión Allons"
              value={`− ${lps(quote.allonsFeeCents)}`}
            />
            {quote.isvCents > 0 && (
              <Row label="ISV" value={`− ${lps(quote.isvCents)}`} />
            )}
            <Row
              label="Recibe el comercio"
              value={lps(quote.providerNetCents)}
              strong
            />
          </dl>
        </div>

        <Button type="submit" size="sm" variant="brand">
          Guardar comisiones
        </Button>
      </form>
    </section>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className={strong ? "font-medium" : "text-white/50"}>{label}</dt>
      <dd className={strong ? "font-semibold" : "text-white/70"}>{value}</dd>
    </div>
  );
}
