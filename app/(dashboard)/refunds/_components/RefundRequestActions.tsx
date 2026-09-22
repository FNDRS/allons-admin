"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Resolver una solicitud. Aprobar cancela la entrada y deja el reembolso
 * listo para pagarse desde la tabla de abajo; rechazar sólo la cierra.
 */
export function RefundRequestActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function resolve(status: "approved" | "rejected") {
    setError(null);
    const res = await fetch(`/api/admin/refund-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, resolutionNote: note || null }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setError(data.message ?? "No se pudo resolver la solicitud");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Nota para el cliente (opcional)"
        className="w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() => void resolve("approved")}
        >
          Aprobar y cancelar entrada
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => void resolve("rejected")}
        >
          Rechazar
        </Button>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
