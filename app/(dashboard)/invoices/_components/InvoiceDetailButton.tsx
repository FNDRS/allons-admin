"use client";

import type { ProviderInvoice } from "@/lib/admin/invoicesApi";
import { useState } from "react";

const PLAN_LABEL: Record<string, string> = {
  single_event: "Evento Único",
  basico: "Básico",
  pro: "Pro",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagada",
  void: "Anulada",
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

export function InvoiceDetailButton({
  invoice,
  comercio,
}: {
  invoice: ProviderInvoice;
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
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 px-7 py-6">
              <div>
                <p className="text-lg font-bold tracking-tight text-white">
                  Allons
                </p>
                <p className="text-xs text-white/45">Suscripción · Comercios</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  Factura
                </p>
                <p className="font-mono text-sm text-white">
                  {invoice.invoiceNumber}
                </p>
                <p className="mt-1 inline-block bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
                  {STATUS_LABEL[invoice.status] ?? invoice.status}
                </p>
              </div>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-3 gap-3 border-b border-white/10 px-7 py-5 text-xs">
              <div>
                <p className="text-white/40">Emitida</p>
                <p className="text-white">{formatDate(invoice.issuedAt)}</p>
              </div>
              <div>
                <p className="text-white/40">Vence</p>
                <p className="text-white">{formatDate(invoice.dueAt)}</p>
              </div>
              <div>
                <p className="text-white/40">Pagada</p>
                <p className="text-white">{formatDate(invoice.paidAt)}</p>
              </div>
            </div>

            {/* Bill to */}
            <div className="border-b border-white/10 px-7 py-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                Facturar a
              </p>
              <p className="mt-1 text-sm font-semibold text-white">{comercio}</p>
            </div>

            {/* Line item */}
            <div className="px-7 py-5">
              <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-white/10 pb-2 text-[10px] font-bold uppercase tracking-wide text-white/40">
                <div>Concepto</div>
                <div className="text-right">Monto</div>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-2 py-3 text-sm">
                <div>
                  <p className="text-white">
                    Plan {PLAN_LABEL[invoice.planId] ?? invoice.planId} ·{" "}
                    {invoice.billingInterval === "annual" ? "Anual" : invoice.billingInterval}
                    {invoice.prorated ? " (prorrateado)" : ""}
                  </p>
                  <p className="text-xs text-white/45">
                    {formatDate(invoice.periodStart)} → {formatDate(invoice.periodEnd)}
                  </p>
                </div>
                <div className="text-right text-white">
                  {money(invoice.amountCents, invoice.currency)}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-3">
                <p className="text-sm font-bold uppercase tracking-wide text-white/70">
                  Total
                </p>
                <p className="text-lg font-bold text-white">
                  {money(invoice.amountCents, invoice.currency)}
                </p>
              </div>

              {invoice.notes ? (
                <div className="mt-4 border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/70">
                  <span className="text-white/40">Notas: </span>
                  {invoice.notes}
                </div>
              ) : null}
            </div>

            {/* Footer / scope note */}
            <div className="border-t border-white/10 px-7 py-4">
              <p className="text-[10px] leading-relaxed text-white/35">
                Documento de control interno — no es un comprobante fiscal
                (CAI/SAR). La generación de PDF y la numeración fiscal formal son
                un paso aparte.
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
