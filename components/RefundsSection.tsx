"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listRefunds,
  type AdminRefundRow,
  type AdminRefundStatus,
} from "@/lib/admin/refundsApi";
import { StatusPill } from "@/components/StatusPill";

function formatCurrency(value: number, currency: string) {
  const prefix = currency === "HNL" ? "L." : currency;
  return `${prefix} ${value.toLocaleString("es-HN", { maximumFractionDigits: 0 })}`;
}

const REFUND_STATUS_VARIANT: Record<
  AdminRefundStatus,
  "success" | "warning" | "danger" | "info" | "muted"
> = {
  requested: "warning",
  skipped_policy: "muted",
  approved: "info",
  paid: "success",
  denied: "danger",
  failed: "danger",
};

const REFUND_STATUS_LABEL: Record<AdminRefundStatus, string> = {
  requested: "Solicitado",
  skipped_policy: "Fuera de política",
  approved: "Aprobado",
  paid: "Pagado",
  denied: "Denegado",
  failed: "Fallido",
};

const REASON_LABEL: Record<string, string> = {
  user_cancelled: "Cliente canceló",
  provider_cancelled: "Comercio canceló",
  duplicate_charge: "Cobro duplicado",
};

const FILTERS: AdminRefundStatus[] = [
  "requested",
  "approved",
  "paid",
  "denied",
  "failed",
  "skipped_policy",
];

export function RefundsSection() {
  const [items, setItems] = useState<AdminRefundRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminRefundStatus | "">("");

  const fetchItems = useCallback(async (status?: AdminRefundStatus) => {
    setLoading(true);
    setError("");
    try {
      const result = await listRefunds({ status, limit: 50 });
      setItems(result.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const handleStatusFilter = (status: AdminRefundStatus) => {
    const next = status === statusFilter ? "" : status;
    setStatusFilter(next);
    void fetchItems(next || undefined);
  };

  const handleRefresh = () => {
    void fetchItems(statusFilter || undefined);
  };

  const exportCsv = () => {
    const header = "ID,Estado,Motivo,Monto,Solicitado,Resuelto,OrderId,UserId\n";
    const rows = items
      .map(
        (r) =>
          `${r.id},${REFUND_STATUS_LABEL[r.status] ?? r.status},${REASON_LABEL[r.reason] ?? r.reason},${(r.amountCents / 100).toFixed(2)},${r.requestedAt},${r.resolvedAt ?? ""},${r.paymentOrderId},${r.userId}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reembolsos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => handleStatusFilter(f)}
              className={`rounded px-3 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                statusFilter === f
                  ? "bg-orange-600 text-white"
                  : "bg-white/10 text-muted hover:text-white"
              }`}
            >
              {REFUND_STATUS_LABEL[f]}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="rounded bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted hover:text-white"
          >
            ↻ Refrescar
          </button>
          <button
            onClick={exportCsv}
            disabled={items.length === 0}
            className="rounded bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted hover:text-white disabled:opacity-40"
          >
            ⬇ CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="futuristic-panel p-6 text-center text-sm text-muted">
          Cargando reembolsos…
        </div>
      ) : error ? (
        <div className="futuristic-panel p-6 text-center text-sm text-red-400">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="futuristic-panel p-6 text-center text-sm text-muted">
          {statusFilter
            ? `No hay reembolsos en estado "${REFUND_STATUS_LABEL[statusFilter]}".`
            : "No hay reembolsos registrados."}
        </div>
      ) : (
        <div className="futuristic-panel overflow-hidden">
          <div className="-mx-2 overflow-x-auto">
            <div
              className="grid min-w-[920px] border-b border-white/12 bg-white/[0.02] px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted"
              style={{
                gridTemplateColumns:
                  "130px 110px 150px 140px 140px 1fr",
              }}
            >
              <div>Estado</div>
              <div className="text-right">Monto</div>
              <div>Motivo</div>
              <div>Solicitado</div>
              <div>Resuelto</div>
              <div>Order / Paygate</div>
            </div>
            {items.map((row) => (
              <div
                key={row.id}
                className="grid min-w-[920px] items-center border-b border-white/8 px-4 py-3 text-sm last:border-b-0 hover:bg-white/[0.02]"
                style={{
                  gridTemplateColumns:
                    "130px 110px 150px 140px 140px 1fr",
                }}
              >
                <div>
                  <StatusPill
                    label={REFUND_STATUS_LABEL[row.status] ?? row.status}
                    variant={REFUND_STATUS_VARIANT[row.status] ?? "muted"}
                  />
                </div>
                <div className="text-right font-bold">
                  {formatCurrency(row.amountCents / 100, row.currency)}
                </div>
                <div className="truncate text-white/80" title={row.reason}>
                  {REASON_LABEL[row.reason] ?? row.reason}
                </div>
                <div className="text-[11px] text-muted">
                  {new Date(row.requestedAt).toLocaleDateString("es-HN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
                <div className="text-[11px] text-muted">
                  {row.resolvedAt
                    ? new Date(row.resolvedAt).toLocaleDateString("es-HN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </div>
                <div className="truncate font-mono text-[11px] text-muted">
                  <div title={row.paymentOrderId}>
                    Order: {row.paymentOrderId.slice(0, 8)}…
                  </div>
                  <div
                    className="text-white/40"
                    title={row.paygatePaymentId ?? ""}
                  >
                    Paygate: {row.paygatePaymentId ?? "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
