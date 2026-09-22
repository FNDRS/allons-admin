"use client";

import {
  resendInviteAction,
  setProviderStatusAction,
} from "@/lib/admin/actions";
import type { ProviderStatus } from "@/lib/admin/providerTypes";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

export function ProviderStatusActions({
  userId,
  status,
  emailConfirmedAt,
  revalidatePath,
}: {
  userId: string;
  status: ProviderStatus;
  emailConfirmedAt: string | null;
  revalidatePath: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {emailConfirmedAt === null ? (
        <form action={resendInviteAction}>
          <input type="hidden" name="userId" value={userId} />
          <Button
            type="submit"
            size="sm"
            variant="info"
            title="Reenviar enlace de invitación por correo"
          >
            <RefreshCw size={12} />
            Reenviar invitación
          </Button>
        </form>
      ) : null}
      {status !== "approved" ? (
        <StatusActionButton
          userId={userId}
          status="approved"
          label="Aprobar"
          tone="success"
          revalidatePath={revalidatePath}
        />
      ) : null}
      {status !== "paused" && status !== "pending" ? (
        <StatusActionButton
          userId={userId}
          status="paused"
          label="Pausar"
          tone="muted"
          revalidatePath={revalidatePath}
        />
      ) : null}
      {status !== "suspended" ? (
        <StatusActionButton
          userId={userId}
          status="suspended"
          label="Suspender"
          tone="danger"
          revalidatePath={revalidatePath}
        />
      ) : (
        <StatusActionButton
          userId={userId}
          status="approved"
          label="Reactivar"
          tone="success"
          revalidatePath={revalidatePath}
        />
      )}
    </div>
  );
}

function statusToastMessage(
  status: ProviderStatus,
  label: string,
): string {
  if (status === "approved") {
    return label === "Reactivar" ? "Comercio reactivado" : "Comercio aprobado";
  }
  if (status === "paused") return "Comercio pausado";
  if (status === "suspended") return "Comercio suspendido";
  return "Estado del comercio actualizado";
}

function StatusActionButton({
  userId,
  status,
  label,
  tone,
  revalidatePath,
}: {
  userId: string;
  status: ProviderStatus;
  label: string;
  tone: "success" | "danger" | "muted";
  revalidatePath: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const variant =
    tone === "success"
      ? "success"
      : tone === "danger"
        ? "destructive"
        : "outline";

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            await setProviderStatusAction(formData);
            toast.success(statusToastMessage(status, label));
            router.refresh();
          } catch (err) {
            toast.error(
              err instanceof Error
                ? err.message
                : "No se pudo actualizar el comercio",
            );
          }
        });
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="revalidate" value={revalidatePath} />
      <Button type="submit" size="sm" variant={variant} disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 size={12} className="animate-spin" aria-hidden />
            <span>{label}…</span>
          </>
        ) : (
          label
        )}
      </Button>
    </form>
  );
}
