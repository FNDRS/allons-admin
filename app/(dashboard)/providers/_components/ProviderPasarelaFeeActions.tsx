"use client";

import { useState } from "react";
import { setProviderCommissionFeesAction } from "@/lib/admin/actions";
import {
  DEFAULT_ALLONS_FEE,
  DEFAULT_PASARELA_FEE,
} from "@/lib/commissionTiers";

/**
 * Edits a comercio's two per-ticket fees: bank/pasarela offer and Allons
 * relationship %. Both are stored on the owner metadata and read by allons-api.
 */
export function ProviderPasarelaFeeActions({
  userId,
  pasarelaFeePct,
  allonsFeePct,
  revalidatePath,
}: {
  userId: string;
  pasarelaFeePct: number | null;
  allonsFeePct: number | null;
  revalidatePath: string;
}) {
  const [pasarela, setPasarela] = useState(
    String(pasarelaFeePct ?? DEFAULT_PASARELA_FEE),
  );
  const [allons, setAllons] = useState(
    String(allonsFeePct ?? DEFAULT_ALLONS_FEE),
  );

  return (
    <form
      action={setProviderCommissionFeesAction}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="revalidate" value={revalidatePath} />
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-white/40">
          Comisión banco / pasarela (%)
        </label>
        <div className="flex items-center gap-1.5">
          <input
            name="pasarelaFeePct"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={pasarela}
            onChange={(e) => setPasarela(e.target.value)}
            className="w-24 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
          />
          <span className="text-sm text-white/50">%</span>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-white/40">
          Comisión Allons (%)
        </label>
        <div className="flex items-center gap-1.5">
          <input
            name="allonsFeePct"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={allons}
            onChange={(e) => setAllons(e.target.value)}
            className="w-24 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white focus:border-white/30 focus:outline-none"
          />
          <span className="text-sm text-white/50">%</span>
        </div>
      </div>
      <button
        type="submit"
        className="border border-white/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/5"
      >
        Guardar
      </button>
    </form>
  );
}
