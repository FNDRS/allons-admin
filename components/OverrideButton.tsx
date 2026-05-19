"use client";

import { useState } from "react";
import { overridePaymentOrder } from "@/lib/admin/paymentsApi";

export function OverrideButton({
  orderId,
  currentStatus,
  onDone,
}: {
  orderId: string;
  currentStatus: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [targetStatus, setTargetStatus] = useState(
    currentStatus === "paid" ? "cancelled" : "paid",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-muted underline underline-offset-2 hover:text-white"
      >
        Anular
      </button>
    );
  }

  const handleOverride = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    setError("");
    try {
      await overridePaymentOrder(orderId, targetStatus, reason.trim());
      setOpen(false);
      onDone();
    } catch (err: any) {
      setError(err.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded bg-white/5 p-2">
      <select
        value={targetStatus}
        onChange={(e) => setTargetStatus(e.target.value)}
        className="rounded border border-white/20 bg-black/40 px-2 py-1 text-[11px] text-white"
      >
        <option value="paid">Marcar como pagado</option>
        <option value="cancelled">Cancelar orden</option>
        <option value="failed">Marcar como fallido</option>
      </select>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Razón (requerida)"
        className="rounded border border-white/20 bg-black/40 px-2 py-1 text-[11px] text-white placeholder:text-muted"
      />
      {error && <span className="text-[10px] text-red-400">{error}</span>}
      <div className="flex gap-2">
        <button
          onClick={handleOverride}
          disabled={loading || !reason.trim()}
          className="rounded bg-orange-600 px-3 py-1 text-[10px] font-bold uppercase text-white disabled:opacity-40"
        >
          {loading ? "..." : "Confirmar"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded bg-white/10 px-3 py-1 text-[10px] font-bold uppercase text-muted"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
