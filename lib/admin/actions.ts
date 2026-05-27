"use server";

import { logAdminAudit } from "@/lib/admin/auditLog";
import { requireRootActor } from "@/lib/admin/getRootActor";
import type { ProviderStatus } from "@/lib/admin/users";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const BAN_FOREVER = "876600h"; // 100 years — Supabase requires a finite duration.

export async function setUserSuspended(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  const suspend = String(formData.get("suspend") ?? "true") === "true";
  const revalidate = String(formData.get("revalidate") ?? "/users");

  if (!userId) throw new Error("userId requerido");

  const admin = createSupabaseServiceRoleClient();

  let beforeSuspended: boolean | null = null;
  const { data: beforeUser, error: beforeErr } =
    await admin.auth.admin.getUserById(userId);
  if (!beforeErr && beforeUser?.user?.banned_until) {
    beforeSuspended =
      Date.parse(String(beforeUser.user.banned_until)) > Date.now();
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? BAN_FOREVER : "none",
  });

  await logAdminAudit({
    actor_user_id: caller.userId,
    actor_email: caller.email,
    source: "server_action",
    action: suspend ? "auth.user_suspend" : "auth.user_unsuspend",
    resource_type: "auth_user",
    resource_id: userId,
    outcome: error ? "failure" : "success",
    state_before:
      beforeSuspended === null ? {} : { banned: Boolean(beforeSuspended) },
    state_after: suspend ? { banned: true } : { banned: false },
    error_message: error?.message ?? null,
  });

  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
}

export async function setProviderStatusAction(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "") as ProviderStatus;
  const revalidate = String(formData.get("revalidate") ?? "/providers");
  const allowed: ProviderStatus[] = [
    "pending",
    "approved",
    "paused",
    "suspended",
  ];

  if (!userId || !allowed.includes(status)) {
    throw new Error("Parámetros inválidos");
  }

  const admin = createSupabaseServiceRoleClient();
  const { data: existing, error: lookupError } =
    await admin.auth.admin.getUserById(userId);
  if (lookupError) throw new Error(lookupError.message);
  if (!existing.user) throw new Error("Usuario no encontrado");

  const meta = (existing.user.user_metadata ?? {}) as Record<string, unknown>;
  const previousStatus =
    typeof meta.providerStatus === "string" ? meta.providerStatus : null;

  const merged = {
    ...meta,
    providerStatus: status,
    providerStatusUpdatedBy: caller.userId,
    providerStatusUpdatedAt: new Date().toISOString(),
  };
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: merged,
    ban_duration: status === "suspended" ? BAN_FOREVER : "none",
  });

  await logAdminAudit({
    actor_user_id: caller.userId,
    actor_email: caller.email,
    source: "server_action",
    action: "provider.status_change",
    resource_type: "provider_user",
    resource_id: userId,
    outcome: updateError ? "failure" : "success",
    state_before: previousStatus ? { providerStatus: previousStatus } : {},
    state_after: { providerStatus: status },
    error_message: updateError?.message ?? null,
  });

  if (updateError) throw new Error(updateError.message);

  revalidatePath(revalidate);
}

const PLAN_VALUES = ["pendiente", "single_event", "basico", "pro"] as const;
type PlanValue = (typeof PLAN_VALUES)[number];
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Sets a comercio's subscription plan. A real plan activates the account for a
 * one-year term; "pendiente" clears `subscription_status`/`subscription_period_end`
 * so the API derives trialing/expired from `free_trial_end`. Canonical state lives in the owner's user_metadata
 * (read by allons-api and allons-mobile).
 */
export async function setProviderPlanAction(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  const plan = String(formData.get("plan") ?? "") as PlanValue;
  const revalidate = String(formData.get("revalidate") ?? "/providers");

  if (!userId || !PLAN_VALUES.includes(plan)) {
    throw new Error("Parámetros inválidos");
  }

  const admin = createSupabaseServiceRoleClient();
  const { data: existing, error: lookupError } =
    await admin.auth.admin.getUserById(userId);
  if (lookupError) throw new Error(lookupError.message);
  if (!existing.user) throw new Error("Usuario no encontrado");

  const meta = (existing.user.user_metadata ?? {}) as Record<string, unknown>;
  const previousPlan =
    typeof meta.subscription_plan === "string" ? meta.subscription_plan : null;

  const merged: Record<string, unknown> = {
    ...meta,
    subscription_plan: plan,
    subscriptionUpdatedBy: caller.userId,
    subscriptionUpdatedAt: new Date().toISOString(),
  };
  if (plan === "pendiente") {
    // No active plan — let the API derive trialing/expired from free_trial_end.
    delete merged.subscription_status;
    delete merged.subscription_period_end;
  } else {
    merged.subscription_status = "active";
    merged.subscription_period_end = new Date(
      Date.now() + ONE_YEAR_MS,
    ).toISOString();
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: merged,
  });

  await logAdminAudit({
    actor_user_id: caller.userId,
    actor_email: caller.email,
    source: "server_action",
    action: "provider.plan_change",
    resource_type: "provider_user",
    resource_id: userId,
    outcome: updateError ? "failure" : "success",
    state_before: { subscription_plan: previousPlan },
    state_after: { subscription_plan: plan },
    error_message: updateError?.message ?? null,
  });

  if (updateError) throw new Error(updateError.message);

  revalidatePath(revalidate);
}

/**
 * Immediate cut: cancels a comercio's subscription right now (not at period end).
 * Sets `subscription_status='canceled'` and ends the term immediately so allons-api
 * and allons-mobile lock the account and show the paywall. Use for fraud, chargebacks
 * or ToS violations — the ordinary self-serve "cancelar al final del período" lives in
 * the mobile app and keeps access until the term ends.
 */
export async function cancelProviderSubscriptionAction(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  const revalidate = String(formData.get("revalidate") ?? "/providers");

  if (!userId) throw new Error("userId requerido");

  const admin = createSupabaseServiceRoleClient();
  const { data: existing, error: lookupError } =
    await admin.auth.admin.getUserById(userId);
  if (lookupError) throw new Error(lookupError.message);
  if (!existing.user) throw new Error("Usuario no encontrado");

  const meta = (existing.user.user_metadata ?? {}) as Record<string, unknown>;
  const previousStatus =
    typeof meta.subscription_status === "string"
      ? meta.subscription_status
      : null;
  const now = new Date().toISOString();

  const merged: Record<string, unknown> = {
    ...meta,
    subscription_status: "canceled",
    // End the term now so the derived state is locked, not "cancel at period end".
    subscription_period_end: now,
    subscription_cancel_at_period_end: false,
    subscription_canceled_at: now,
    subscriptionUpdatedBy: caller.userId,
    subscriptionUpdatedAt: now,
  };

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: merged,
  });

  await logAdminAudit({
    actor_user_id: caller.userId,
    actor_email: caller.email,
    source: "server_action",
    action: "provider.subscription_cancel",
    resource_type: "provider_user",
    resource_id: userId,
    outcome: updateError ? "failure" : "success",
    state_before: { subscription_status: previousStatus },
    state_after: { subscription_status: "canceled" },
    error_message: updateError?.message ?? null,
  });

  if (updateError) throw new Error(updateError.message);

  revalidatePath(revalidate);
}

export async function resendInviteAction(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) throw new Error("userId requerido");

  const admin = createSupabaseServiceRoleClient();
  const { data: existing, error: lookupError } =
    await admin.auth.admin.getUserById(userId);
  if (lookupError) throw new Error(lookupError.message);
  const target = existing.user;
  if (!target?.email) {
    redirect("/providers?resent=missing_email");
  }

  if (target.email_confirmed_at) {
    await logAdminAudit({
      actor_user_id: caller.userId,
      actor_email: caller.email,
      source: "server_action",
      action: "provider.invite_resend",
      resource_type: "provider_user",
      resource_id: userId,
      outcome: "success",
      state_after: { skipped: true, reason: "already_confirmed" },
    });
    redirect("/providers?resent=already_confirmed");
  }

  // Same contract as createComercioAction — HTTPS so Supabase preview / mail
  // clients never surface allons:// (blocked in email).
  const redirectTo =
    process.env.APP_INVITE_REDIRECT_URL ?? "https://allonsapp.com/verify";
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    target.email,
    {
      data: (target.user_metadata ?? {}) as Record<string, unknown>,
      redirectTo,
    },
  );

  await logAdminAudit({
    actor_user_id: caller.userId,
    actor_email: caller.email,
    source: "server_action",
    action: "provider.invite_resend",
    resource_type: "provider_user",
    resource_id: userId,
    outcome: inviteError ? "failure" : "success",
    state_after: { email: target.email },
    error_message: inviteError?.message ?? null,
  });

  if (inviteError) {
    redirect(
      `/providers?resent=failed&reason=${encodeURIComponent(inviteError.message.slice(0, 120))}`,
    );
  }

  revalidatePath("/providers");
  redirect(`/providers?resent=ok&email=${encodeURIComponent(target.email)}`);
}
