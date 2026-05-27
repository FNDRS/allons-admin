"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completePayout } from "@/lib/admin/payoutsApi";

/**
 * Marks a pending payout as completed after the operator made the bank
 * transfer (settlement stays manual). Mirrors OverrideButton: inline confirm,
 * then refresh the server-rendered list.
 */
export function CompletePayoutButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-muted underline underline-offset-2 hover:text-white"
      >
        Completar
      </button>
    );
  }

  const handleComplete = async () => {
    setLoading(true);
    setError("");
    try {
      await completePayout(id);
      setConfirming(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <button
          onClick={handleComplete}
          disabled={loading}
          className="rounded bg-orange-600 px-3 py-1 text-[10px] font-bold uppercase text-white disabled:opacity-40"
        >
          {loading ? "..." : "Confirmar"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="rounded bg-white/10 px-3 py-1 text-[10px] font-bold uppercase text-muted"
        >
          Cancelar
        </button>
      </div>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
