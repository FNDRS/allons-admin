"use client";

import { useState, useCallback, useEffect } from "react";
import { listPaymentOrders, type AdminPaymentOrder } from "@/lib/admin/paymentsApi";
import { StatusPill } from "@/components/StatusPill";
import { OverrideButton } from "@/components/OverrideButton";

function formatCurrency(value: number) {
  return `L. ${value.toLocaleString("es-HN", { maximumFractionDigits: 0 })}`;
}

const ORDER_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  paid: "success",
  pending_payment: "warning",
  pending: "warning",
  failed: "danger",
  cancelled: "muted",
  refunded: "info",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  paid: "Pagado",
  pending_payment: "Pendiente",
  pending: "Pendiente",
  failed: "Fallido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export function OrdersSection() {
  const [orders, setOrders] = useState<AdminPaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchOrders = useCallback(async (status?: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await listPaymentOrders({ status, limit: 50 });
      setOrders(result.items);
    } catch (err: any) {
      setError(err.message ?? "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const handleRefresh = () => {
    fetchOrders(statusFilter || undefined);
  };

  const handleStatusFilter = (status: string) => {
    const next = status === statusFilter ? "" : status;
    setStatusFilter(next);
    void fetchOrders(next || undefined);
  };

  const exportCsv = () => {
    const header = "ID,Estado,Monto,Cantidad,Fecha\n";
    const rows = orders
      .map(
        (o) =>
          `${o.id},${ORDER_STATUS_LABEL[o.status] ?? o.status},${(o.amountCents / 100).toFixed(2)},${o.quantity},${o.createdAt}`,
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ordenes-pago-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const FILTERS = ["paid", "pending_payment", "failed", "cancelled"];

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
              {ORDER_STATUS_LABEL[f] ?? f}
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
            disabled={orders.length === 0}
            className="rounded bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted hover:text-white disabled:opacity-40"
          >
            ⬇ CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="futuristic-panel p-6 text-center text-sm text-muted">Cargando órdenes…</div>
      ) : error ? (
        <div className="futuristic-panel p-6 text-center text-sm text-red-400">{error}</div>
      ) : orders.length === 0 ? (
        <div className="futuristic-panel p-6 text-center text-sm text-muted">
          {statusFilter ? `No hay órdenes con estado "${ORDER_STATUS_LABEL[statusFilter]}"` : "No hay órdenes registradas."}
        </div>
      ) : (
        <div className="futuristic-panel overflow-hidden">
          <div
            className="grid border-b border-white/12 bg-white/[0.02] px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted"
            style={{ gridTemplateColumns: "100px 120px 60px 140px 1fr 180px" }}
          >
            <div>Estado</div>
            <div className="text-right">Monto</div>
            <div className="text-center">Cant.</div>
            <div>Fecha</div>
            <div>ID</div>
            <div>Acción</div>
          </div>
          {orders.map((order) => (
            <div
              key={order.id}
              className="grid items-center border-b border-white/8 px-4 py-3 text-sm last:border-b-0 hover:bg-white/[0.02]"
              style={{ gridTemplateColumns: "100px 120px 60px 140px 1fr 180px" }}
            >
              <div>
                <StatusPill
                  label={ORDER_STATUS_LABEL[order.status] ?? order.status}
                  variant={ORDER_STATUS_VARIANT[order.status] ?? "muted"}
                />
              </div>
              <div className="text-right font-bold">{formatCurrency(order.amountCents / 100)}</div>
              <div className="text-center">{order.quantity}</div>
              <div className="text-[11px] text-muted">
                {new Date(order.createdAt).toLocaleDateString("es-HN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="break-all font-mono text-[11px] leading-snug text-muted">
                {order.id}
              </div>
              <div>
                <OverrideButton orderId={order.id} currentStatus={order.status} onDone={handleRefresh} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
