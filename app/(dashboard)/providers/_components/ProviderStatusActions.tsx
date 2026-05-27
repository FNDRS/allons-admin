"use client";

import {
  resendInviteAction,
  setProviderStatusAction,
} from "@/lib/admin/actions";
import type { ProviderStatus } from "@/lib/admin/users";
import { Loader2 } from "lucide-react";
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
    <div className="flex flex-wrap gap-1.5">
      {emailConfirmedAt === null ? (
        <form action={resendInviteAction}>
          <input type="hidden" name="userId" value={userId} />
          <button
            type="submit"
            title="Reenviar enlace de invitación por correo"
            className="border border-[#3A86FF]/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#3A86FF] transition hover:bg-[#3A86FF]/10"
          >
            ↻ Reenviar invitación
          </button>
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

  const styles =
    tone === "success"
      ? "border-success/40 text-success hover:bg-success/10"
      : tone === "danger"
        ? "border-danger/40 text-danger hover:bg-danger/10"
        : "border-white/15 text-muted hover:bg-white/5";

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
      <button
        type="submit"
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60 ${styles}`}
      >
        {isPending ? (
          <>
            <Loader2 size={12} className="animate-spin" aria-hidden />
            <span>{label}…</span>
          </>
        ) : (
          label
        )}
      </button>
    </form>
  );
}
