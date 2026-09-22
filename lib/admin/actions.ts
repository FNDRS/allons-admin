"use server";

import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { requireRootActor } from "@/lib/admin/getRootActor";
import {
  resendProviderInviteApi,
  setProviderFeesApi,
  setProviderStatusApi,
} from "@/lib/admin/providersApi";
import { setAdminUserSuspended } from "@/lib/admin/usersApi";
import type { ProviderStatus } from "@/lib/admin/users";
import {
  clampFeePct,
  DEFAULT_ALLONS_FEE,
  DEFAULT_PASARELA_FEE,
} from "@/lib/commissionTiers";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

const PROVIDER_STATUSES: ProviderStatus[] = [
  "pending",
  "approved",
  "paused",
  "suspended",
];

/**
 * Every action here delegates to `allons-api`, which performs the change and
 * records the audit row in the same request. The panel no longer writes either.
 */
function afterMutation(revalidate: string) {
  revalidateTag("admin-users", "max");
  revalidatePath(revalidate);
}

export async function setUserSuspended(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  const suspend = String(formData.get("suspend") ?? "true") === "true";
  const revalidate = String(formData.get("revalidate") ?? "/users");

  if (!userId) throw new Error("userId requerido");

  try {
    await setAdminUserSuspended(userId, suspend, caller);
  } catch (error) {
    throw new Error(
      adminApiErrorMessage(error, "No se pudo cambiar el estado del usuario"),
    );
  }

  afterMutation(revalidate);
}

export async function setProviderStatusAction(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "") as ProviderStatus;
  const revalidate = String(formData.get("revalidate") ?? "/providers");

  if (!userId || !PROVIDER_STATUSES.includes(status)) {
    throw new Error("Parámetros inválidos");
  }

  try {
    await setProviderStatusApi(userId, status, caller);
  } catch (error) {
    throw new Error(
      adminApiErrorMessage(error, "No se pudo cambiar el estado del comercio"),
    );
  }

  afterMutation(revalidate);
}

/**
 * Sets a comercio's per-ticket fees: pasarela (bank / Clinpays offer) and
 * Allons (relationship %). Read by allons-api at sale / refund time.
 */
export async function setProviderCommissionFeesAction(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  const revalidate = String(formData.get("revalidate") ?? "/providers");

  if (!userId) throw new Error("Parámetros inválidos");

  try {
    await setProviderFeesApi(
      userId,
      {
        pasarelaFeePct: clampFeePct(
          formData.get("pasarelaFeePct") as string | null,
          DEFAULT_PASARELA_FEE,
        ),
        allonsFeePct: clampFeePct(
          formData.get("allonsFeePct") as string | null,
          DEFAULT_ALLONS_FEE,
        ),
      },
      caller,
    );
  } catch (error) {
    throw new Error(
      adminApiErrorMessage(error, "No se pudieron guardar las comisiones"),
    );
  }

  afterMutation(revalidate);
}

export async function resendInviteAction(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("userId requerido");

  const result = await resendProviderInviteApi(userId, caller);

  if (result.outcome === "missing_email") {
    redirect("/providers?resent=missing_email");
  }
  if (result.outcome === "already_confirmed") {
    redirect("/providers?resent=already_confirmed");
  }
  if (result.outcome === "failed") {
    redirect(
      `/providers?resent=failed&reason=${encodeURIComponent(result.error.slice(0, 120))}`,
    );
  }

  revalidatePath("/providers");
  redirect(`/providers?resent=ok&email=${encodeURIComponent(result.email)}`);
}
