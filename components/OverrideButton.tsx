"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
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
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-auto px-0"
      >
        Anular
      </Button>
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
      <Select
        value={targetStatus}
        onValueChange={setTargetStatus}
        className="text-[11px]"
      >
        <SelectItem value="paid">Marcar como pagado</SelectItem>
        <SelectItem value="cancelled">Cancelar orden</SelectItem>
        <SelectItem value="failed">Marcar como fallido</SelectItem>
      </Select>
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Por qué (obligatorio)"
        className="h-8 text-[11px]"
      />
      {error && <span className="text-[10px] text-red-400">{error}</span>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="brand"
          onClick={handleOverride}
          disabled={loading || !reason.trim()}
        >
          {loading ? "..." : "Confirmar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setOpen(false)}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
