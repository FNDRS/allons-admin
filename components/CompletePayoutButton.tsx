"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={() => setConfirming(true)}
        className="h-auto px-0"
      >
        Completar
      </Button>
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
        <Button
          type="button"
          size="sm"
          variant="brand"
          onClick={handleComplete}
          disabled={loading}
        >
          {loading ? "..." : "Confirmar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setConfirming(false)}
          disabled={loading}
        >
          Cancelar
        </Button>
      </div>
      {error && <span className="text-[10px] text-red-400">{error}</span>}
    </div>
  );
}
