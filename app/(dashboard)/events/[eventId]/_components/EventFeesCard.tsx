import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setEventFees } from "@/lib/admin/eventActions";
import {
  ADMIN_FEE_MODES,
  type AdminEventFeeConfig,
} from "@/lib/admin/eventsApi";

const lps = (cents: number) =>
  `L ${(cents / 100).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Configura las comisiones de un evento.
 *
 * Vive por evento y no sólo por comercio porque un mismo comercio corre
 * eventos con acuerdos distintos: en uno absorbe la comisión y en otro la
 * traslada entera al comprador. Cualquier campo vacío usa el valor del
 * comercio, así que un evento sin configurar se comporta como siempre.
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

  return (
    <section className="futuristic-panel p-5">
      <div className="eyebrow">Comisiones</div>
      <h2 className="mt-1 text-xl font-semibold">Cobros de este evento</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
        Deja un campo vacío para usar el valor del comercio. El desglose de
        abajo lo calcula la API con la misma fórmula del checkout, así que es lo
        que realmente se va a cobrar.
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
          {ADMIN_FEE_MODES.map((mode) => (
            <label
              key={mode.value}
              className="flex cursor-pointer gap-3 rounded-lg border border-white/10 p-3 hover:border-white/20"
            >
              <input
                type="radio"
                name="feeMode"
                value={mode.value}
                defaultChecked={overrides.feeMode === mode.value}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">{mode.label}</span>
                <span className="block text-xs leading-5 text-white/50">
                  {mode.hint}
                </span>
              </span>
            </label>
          ))}
          <label className="flex cursor-pointer gap-3 rounded-lg border border-dashed border-white/10 p-3 hover:border-white/20">
            <input
              type="radio"
              name="feeMode"
              value=""
              defaultChecked={overrides.feeMode === null}
              className="mt-1"
            />
            <span className="text-sm text-white/50">
              Usar el valor del comercio
            </span>
          </label>
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
              defaultValue={overrides.allonsFeePct ?? ""}
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
              defaultValue={overrides.gatewayFeePct ?? ""}
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
              defaultValue={
                overrides.gatewayFixedCents === null
                  ? ""
                  : (overrides.gatewayFixedCents / 100).toFixed(2)
              }
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
              defaultValue={overrides.isvPct ?? ""}
              placeholder="Por defecto: 15"
            />
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <div className="text-xs uppercase tracking-wide text-white/40">
            {hasPricedTicket
              ? `Desglose de un boleto de ${lps(preview.subtotalCents)}`
              : `Ejemplo sobre ${lps(preview.subtotalCents)}`}
          </div>
          {!hasPricedTicket && (
            <p className="mt-2 text-xs leading-5 text-white/40">
              Este evento no tiene boletos de pago, así que el desglose usa un
              monto de muestra. El cargo por servicio no es un porcentaje fijo:
              cambia con el precio.
            </p>
          )}
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label="Precio del boleto" value={lps(preview.subtotalCents)} />
            {preview.serviceChargeCents > 0 && (
              <Row
                label="Cargo por servicio"
                value={`+ ${lps(preview.serviceChargeCents)}`}
              />
            )}
            <Row
              label="Paga el comprador"
              value={lps(preview.totalCents)}
              strong
            />
            <Row
              label="Se lleva la pasarela"
              value={`− ${lps(preview.gatewayCostCents)}`}
            />
            <Row
              label="Comisión Allons"
              value={`− ${lps(preview.allonsFeeCents)}`}
            />
            {preview.isvCents > 0 && (
              <Row label="ISV" value={`− ${lps(preview.isvCents)}`} />
            )}
            <Row
              label="Recibe el comercio"
              value={lps(preview.providerNetCents)}
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
