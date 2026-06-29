"use client";

import { useState } from "react";
import { setProviderPasarelaFeeAction } from "@/lib/admin/actions";
import { DEFAULT_PASARELA_FEE } from "@/lib/commissionTiers";

/**
 * Edits a comercio's pasarela (Clinpays + bank) fee %. This is the rate the
 * bank contract sets per business type; it's added to the volume-based Allons
 * base commission and charged automatically per ticket by allons-api.
 */
export function ProviderPasarelaFeeActions({
  userId,
  pasarelaFeePct,
  revalidatePath,
}: {
  userId: string;
  pasarelaFeePct: number | null;
  revalidatePath: string;
}) {
  const [value, setValue] = useState(
    String(pasarelaFeePct ?? DEFAULT_PASARELA_FEE),
  );

  return (
    <form
      action={setProviderPasarelaFeeAction}
      className="flex flex-wrap items-end gap-2"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="revalidate" value={revalidatePath} />
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-white/40">
          Comisión pasarela (%)
        </label>
        <div className="flex items-center gap-1.5">
          <input
            name="pasarelaFeePct"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
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
