"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        <Label htmlFor="pasarelaFeePct" className="text-[10px] uppercase tracking-wide">
          Comisión banco / pasarela (%)
        </Label>
        <div className="flex items-center gap-1.5">
          <Input
            id="pasarelaFeePct"
            name="pasarelaFeePct"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={pasarela}
            onChange={(e) => setPasarela(e.target.value)}
            className="w-24"
          />
          <span className="text-sm text-white/50">%</span>
        </div>
      </div>
      <div>
        <Label htmlFor="allonsFeePct" className="text-[10px] uppercase tracking-wide">
          Comisión Allons (%)
        </Label>
        <div className="flex items-center gap-1.5">
          <Input
            id="allonsFeePct"
            name="allonsFeePct"
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={allons}
            onChange={(e) => setAllons(e.target.value)}
            className="w-24"
          />
          <span className="text-sm text-white/50">%</span>
        </div>
      </div>
      <Button type="submit" size="sm" variant="outline">
        Guardar
      </Button>
    </form>
  );
}
