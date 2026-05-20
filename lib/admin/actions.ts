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

  const redirectTo = process.env.APP_INVITE_REDIRECT_URL;
  const options: { data: Record<string, unknown>; redirectTo?: string } = {
    data: (target.user_metadata ?? {}) as Record<string, unknown>,
  };
  if (redirectTo) options.redirectTo = redirectTo;

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    target.email,
    options,
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
