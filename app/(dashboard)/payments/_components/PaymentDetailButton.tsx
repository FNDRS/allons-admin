"use client";

import type { SubscriptionOrder } from "@/lib/admin/subscriptionOrdersApi";
import { useState } from "react";

const PLAN_LABEL: Record<string, string> = {
  single_event: "Evento Único",
  basico: "Básico",
  pro: "Pro",
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

function money(cents: number, currency = "HNL"): string {
  const value = (cents / 100).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${value}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function PaymentDetailButton({
  order,
  comercio,
}: {
  order: SubscriptionOrder;
  comercio: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border border-white/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/5"
      >
        Ver
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-[#15171a] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-white/10 px-7 py-6">
              <div>
                <p className="text-lg font-bold tracking-tight text-white">
                  Allons
                </p>
                <p className="text-xs text-white/45">Recibo de pago · Paygate</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Pago
                </p>
                <p className="font-mono text-xs text-white/80">
                  {order.id.slice(0, 8)}
                </p>
                <p className="mt-1 inline-block bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
                  {STATUS_LABEL[order.status] ?? order.status}
                </p>
              </div>
            </div>

            <div className="border-b border-white/10 px-7 py-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Comercio
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{comercio}</p>
            </div>

            <div className="px-7 py-5">
              <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-white/10 pb-2 text-[10px] font-bold uppercase tracking-wide text-white/40">
                <div>Concepto</div>
                <div className="text-right">Monto</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 py-3 text-sm">
                <div>
                  <p className="text-white">
                    Plan {PLAN_LABEL[order.planId] ?? order.planId} · Anual
                  </p>
                  <p className="text-xs text-white/45">
                    Pago {formatDate(order.createdAt)}
                    {order.periodEnd
                      ? ` · upgrade prorrateado, vigente hasta ${formatDate(order.periodEnd)}`
                      : ""}
                  </p>
                </div>
                <div className="text-right text-white">
                  {money(order.amountCents, order.currency)}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
                <p className="text-sm font-bold uppercase tracking-wide text-white/70">
                  Total
                </p>
                <p className="text-lg font-bold text-white">
                  {money(order.amountCents, order.currency)}
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 px-7 py-4">
              <p className="text-[10px] leading-relaxed text-white/35">
                Cobro self-serve vía Paygate (tarjeta validada). Documento de
                control interno — no es comprobante fiscal (CAI/SAR); el PDF y la
                numeración fiscal formal son un paso aparte.
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 w-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
