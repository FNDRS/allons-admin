"use client";

import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelProviderSubscriptionAction } from "@/lib/admin/actions";

/**
 * Subscription/account-level controls for a comercio: export its data and the
 * immediate cut (cancel access now). The ordinary cancel-at-period-end is
 * self-serve in the mobile app - this cut is for fraud / chargeback / ToS.
 */
export function ProviderSubscriptionActions({
  userId,
  subscriptionStatus,
  revalidatePath,
}: {
  userId: string;
  subscriptionStatus: string | null;
  revalidatePath: string;
}) {
  const alreadyCanceled = subscriptionStatus === "canceled";

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button asChild size="sm" variant="outline">
        <a href={`/providers/${userId}/export`} download>
          <ArrowDown size={12} />
          Exportar datos
        </a>
      </Button>
      {alreadyCanceled ? null : (
        <form
          action={cancelProviderSubscriptionAction}
          onSubmit={(e) => {
            if (
              !window.confirm(
                "Cortar el acceso cancela la suscripción de inmediato (no al final del período). El comercio quedará bloqueado y deberá volver a suscribirse. ¿Continuar?",
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="revalidate" value={revalidatePath} />
          <Button
            type="submit"
            size="sm"
            variant="destructive"
            title="Cancela la suscripción de inmediato y bloquea el acceso"
          >
            Cortar acceso
          </Button>
        </form>
      )}
    </div>
  );
}
