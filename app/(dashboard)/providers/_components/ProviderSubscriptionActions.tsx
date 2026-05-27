"use client";

import { cancelProviderSubscriptionAction } from "@/lib/admin/actions";

/**
 * Subscription/account-level controls for a comercio: export its data and the
 * immediate cut (cancel access now). The ordinary cancel-at-period-end is
 * self-serve in the mobile app — this cut is for fraud / chargeback / ToS.
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
      <a
        href={`/providers/${userId}/export`}
        download
        className="border border-white/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/5"
      >
        ↧ Exportar datos
      </a>
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
          <button
            type="submit"
            title="Cancela la suscripción de inmediato y bloquea el acceso"
            className="border border-danger/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-danger transition hover:bg-danger/10"
          >
            Cortar acceso
          </button>
        </form>
      )}
    </div>
  );
}
