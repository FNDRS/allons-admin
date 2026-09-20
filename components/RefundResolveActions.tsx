"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  REFUND_NEXT_STATUSES,
  resolveRefund,
  type AdminRefundRow,
  type AdminRefundStatus,
} from "@/lib/admin/refundsApi";

const ACTION_LABEL: Partial<Record<AdminRefundStatus, string>> = {
  approved: "Aprobar",
  paid: "Marcar pagado",
  denied: "Denegar",
  failed: "Marcar fallido",
  needs_reconciliation: "Verificar en Paygate",
};

/** The ones worth a second look before pressing. */
const CONFIRM_COPY: Partial<Record<AdminRefundStatus, string>> = {
  paid: "Marcar como pagado le avisa al cliente que ya tiene su dinero. Hazlo después de hacer la transferencia, no antes.",
  denied: "Denegar es definitivo: no se puede reabrir, solo crear un reembolso nuevo.",
};

/** Lo que hay que haber hecho antes de tocar los botones de esta fila. */
const NEEDS_CHECK_FIRST =
  "El resultado de la reversión es desconocido: puede que el dinero ya haya vuelto. Busca el cobro en Paygate antes de marcarlo pagado o fallido.";

interface Props {
  row: AdminRefundRow;
  onResolved: () => void;
}

/**
 * Turns a refund row into the next thing a person can do with it.
 *
 * None of these buttons move money — the gateway has no partial-refund API,
 * so the transfer happens outside Allons and this only records that it did.
 * That is why "Marcar pagado" asks first: it is the press that tells the
 * customer their money is back.
 */
export function RefundResolveActions({ row, onResolved }: Props) {
  const [busy, setBusy] = useState<AdminRefundStatus | null>(null);
  const [error, setError] = useState("");

  const next = REFUND_NEXT_STATUSES[row.status] ?? [];
  if (next.length === 0) {
    return <span className="text-[11px] text-muted">Cerrado</span>;
  }

  const run0 = row.status === "needs_reconciliation";

  const run = async (status: AdminRefundStatus) => {
    if (run0 && !window.confirm(NEEDS_CHECK_FIRST)) return;
    const confirmCopy = CONFIRM_COPY[status];
    if (confirmCopy && !window.confirm(confirmCopy)) return;

    setBusy(status);
    setError("");
    try {
      await resolveRefund(row.id, status);
      onResolved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {next.map((status) => (
        <Button
          key={status}
          type="button"
          size="sm"
          variant={status === "paid" ? "brand" : "secondary"}
          disabled={busy !== null}
          onClick={() => void run(status)}
        >
          {busy === status ? "…" : (ACTION_LABEL[status] ?? status)}
        </Button>
      ))}
      {error ? (
        <span className="text-[11px] text-red-400" title={error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
