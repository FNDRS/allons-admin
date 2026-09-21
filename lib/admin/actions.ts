"use server";

import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { requireRootActor } from "@/lib/admin/getRootActor";
import {
  cancelProviderSubscriptionApi,
  resendProviderInviteApi,
  setProviderFeesApi,
  setProviderPlanApi,
  setProviderStatusApi,
  type ProviderPlanValue,
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

const PLAN_VALUES: ProviderPlanValue[] = [
  "pendiente",
  "single_event",
  "basico",
  "pro",
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
 * Sets a comercio's subscription plan. A real plan activates the account for a
 * one-year term; "pendiente" leaves the API to derive trialing/expired from
 * `free_trial_end`.
 */
export async function setProviderPlanAction(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  const plan = String(formData.get("plan") ?? "") as ProviderPlanValue;
  const revalidate = String(formData.get("revalidate") ?? "/providers");

  if (!userId || !PLAN_VALUES.includes(plan)) {
    throw new Error("Parámetros inválidos");
  }

  try {
    await setProviderPlanApi(userId, plan, caller);
  } catch (error) {
    throw new Error(adminApiErrorMessage(error, "No se pudo cambiar el plan"));
  }

  afterMutation(revalidate);
}

/**
 * Immediate cut: cancels a comercio's subscription right now (not at period
 * end), so allons-api and allons-mobile lock the account and show the paywall.
 * Use for fraud, chargebacks or ToS violations - the ordinary self-serve
 * "cancelar al final del período" lives in the mobile app.
 */
export async function cancelProviderSubscriptionAction(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  const revalidate = String(formData.get("revalidate") ?? "/providers");

  if (!userId) throw new Error("userId requerido");

  try {
    await cancelProviderSubscriptionApi(userId, caller);
  } catch (error) {
    throw new Error(
      adminApiErrorMessage(error, "No se pudo cancelar la suscripción"),
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
