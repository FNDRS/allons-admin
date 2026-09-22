"use client";

import { StatusPill } from "@/components/StatusPill";
import {
  fetchLiveSnapshot,
  type LiveOrder,
  type LiveSnapshot,
} from "@/lib/admin/liveApi";
import { useEffect, useRef, useState } from "react";

const POLL_MS = 5000;

function money(cents: number) {
  return `L. ${(cents / 100).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "hace 2 min": en una pantalla que se mira de reojo, importa lo reciente. */
function ago(iso: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - +new Date(iso)) / 1000));
  if (seconds < 60) return `hace ${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

const STATUS: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "muted" }
> = {
  paid: { label: "Pagada", variant: "success" },
  pending_payment: { label: "Pendiente", variant: "warning" },
  failed: { label: "Fallida", variant: "danger" },
  cancelled: { label: "Cancelada", variant: "muted" },
};

const ORIGIN: Record<string, string> = {
  ios: "iOS",
  android: "Android",
  web: "Web",
};

export function LiveBoard({ eventId }: { eventId?: string }) {
  const [data, setData] = useState<LiveSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  // Las órdenes ya vistas, para destacar sólo lo que entró recién.
  const seen = useRef<Set<string>>(new Set());
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        const snapshot = await fetchLiveSnapshot(eventId);
        if (!alive) return;
        const nuevas = new Set<string>();
        for (const order of snapshot.recent) {
          if (!seen.current.has(order.orderId)) {
            // La primera carga no destaca nada: todo sería nuevo y el
            // resaltado dejaría de significar "acaba de pasar".
            if (seen.current.size > 0) nuevas.add(order.orderId);
            seen.current.add(order.orderId);
          }
        }
        setFresh(nuevas);
        setData(snapshot);
        setError(null);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "Error");
      } finally {
        if (alive && !paused) timer = setTimeout(tick, POLL_MS);
      }
    }

    void tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [eventId, paused]);

  if (!data) {
    return (
      <div className="futuristic-panel p-6 text-sm text-muted">
        {error ? `No se pudo cargar: ${error}` : "Conectando…"}
      </div>
    );
  }

  const { pulse, schedules, recent, attention, bySource } = data;
  const alerts =
    attention.paidWithoutTickets.length +
    attention.declines.length +
    (attention.expiredPending > 0 ? 1 : 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="relative flex h-2 w-2">
            {!paused ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            ) : null}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${paused ? "bg-white/30" : "bg-emerald-400"}`}
            />
          </span>
          {paused ? "En pausa" : `En vivo · ${ago(data.generatedAt)}`}
          {error ? <span className="text-red-400">· {error}</span> : null}
        </div>
        <button
          onClick={() => setPaused((value) => !value)}
          className="border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white/70 hover:bg-white/5"
        >
          {paused ? "Reanudar" : "Pausar"}
        </button>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Vendido" value={money(pulse.grossCents)} hint={`${pulse.paidCount} órdenes`} />
        <Metric label="Entradas" value={String(pulse.ticketsIssued)} hint="emitidas" />
        <Metric
          label="Conversión"
          value={pulse.conversionPct == null ? "—" : `${pulse.conversionPct}%`}
          hint="pagadas sobre intentadas"
          alarm={pulse.conversionPct != null && pulse.conversionPct < 60}
        />
        <Metric
          label="Pendientes"
          value={String(pulse.pendingCount)}
          hint={money(pulse.pendingCents)}
          alarm={pulse.pendingCount > 0}
        />
        <Metric
          label="Ticket promedio"
          value={pulse.avgTicketCents == null ? "—" : money(pulse.avgTicketCents)}
          hint={`${pulse.failedCount} fallidas`}
        />
      </section>

      {schedules.length > 0 ? (
        <section>
          <div className="eyebrow mb-3">Cupo por horario</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {schedules.map((row) => {
              const pct = row.total > 0 ? Math.min(100, (row.sold / row.total) * 100) : 0;
              return (
                <div key={row.id} className="futuristic-panel p-4">
                  <div className="truncate text-sm font-semibold">{row.name}</div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-bold">
                      {row.sold}
                      <span className="text-sm font-normal text-muted"> / {row.total}</span>
                    </span>
                    <span className="text-xs text-muted">{money(row.grossCents)}</span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-white/10">
                    <div
                      className="h-full rounded bg-[#F67010]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] text-muted">
                    {row.remaining == null
                      ? "Sin tope"
                      : row.remaining === 0
                        ? "Agotado"
                        : `Quedan ${row.remaining}`}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {alerts > 0 ? (
        <section>
          <div className="eyebrow mb-3 text-red-400">Necesita acción</div>
          <div className="futuristic-panel flex flex-col gap-3 border-red-500/30 p-4">
            {attention.paidWithoutTickets.map((row) => (
              <div key={row.orderId} className="text-sm">
                <span className="font-semibold text-red-400">Cobrada sin entradas</span>{" "}
                <span className="text-white/80">
                  {money(row.amountCents)} · {row.buyerName ?? "sin nombre"} · {ago(row.at)}
                </span>
              </div>
            ))}
            {attention.expiredPending > 0 ? (
              <div className="text-sm text-white/80">
                <span className="font-semibold text-amber-400">
                  {attention.expiredPending} pendiente(s) vencida(s)
                </span>{" "}
                nunca se pagaron
              </div>
            ) : null}
            {attention.declines.map((row, index) => (
              <div key={`${row.at}-${index}`} className="text-sm text-white/80">
                <span className="font-semibold text-amber-400">Rechazada</span>{" "}
                {money(row.amountCents)} · {row.buyerName ?? "sin nombre"} ·{" "}
                {row.reason ?? "sin motivo"} · {ago(row.at)}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <span className="eyebrow">Compras</span>
          <span className="text-[11px] text-muted">
            {Object.entries(bySource)
              .map(([key, n]) => `${ORIGIN[key] ?? key}: ${n}`)
              .join(" · ") || "sin origen aún"}
          </span>
        </div>
        {recent.length === 0 ? (
          <div className="futuristic-panel p-6 text-sm text-muted">
            Todavía no hay compras en esta ventana.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((order) => (
              <OrderRow key={order.orderId} order={order} fresh={fresh.has(order.orderId)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  alarm,
}: {
  label: string;
  value: string;
  hint: string;
  alarm?: boolean;
}) {
  return (
    <div className={`futuristic-panel p-4 ${alarm ? "border-amber-500/40" : ""}`}>
      <div className="eyebrow">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${alarm ? "text-amber-400" : ""}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted">{hint}</div>
    </div>
  );
}

function OrderRow({ order, fresh }: { order: LiveOrder; fresh: boolean }) {
  const status = STATUS[order.status] ?? { label: order.status, variant: "muted" as const };
  return (
    <div
      className={`futuristic-panel flex flex-wrap items-center justify-between gap-3 p-3 transition-colors ${
        fresh ? "border-[#F67010]/60 bg-[#F67010]/[0.06]" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{order.buyerName ?? "Sin nombre"}</span>
          <StatusPill label={status.label} variant={status.variant} />
          {fresh ? <StatusPill label="Nueva" variant="warning" /> : null}
        </div>
        <div className="truncate text-xs text-muted">
          {order.scheduleName ?? "Sin horario"} · {order.quantity} entrada(s) ·{" "}
          {order.method === "saved_card" ? "Tarjeta guardada" : "Link"} ·{" "}
          {order.origin ? (ORIGIN[order.origin] ?? order.origin) : "origen desconocido"} ·{" "}
          {ago(order.at)}
        </div>
      </div>
      <div className="text-right font-bold tabular-nums">{money(order.amountCents)}</div>
    </div>
  );
}
