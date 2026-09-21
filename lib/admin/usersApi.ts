import "server-only";

import { adminFetch, type AdminApiActor } from "@/lib/admin/adminFetch";

export type AppRole = "client" | "provider" | "staff";
export type ProviderStatus = "pending" | "approved" | "paused" | "suspended";
export type UserStatus = "active" | "suspended";

export interface AdminUserRecord {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  /** Supabase ban window - a future date means currently banned. */
  bannedUntil: string | null;
  status: UserStatus;
  createdAt: string;
  lastSignInAt: string | null;
  /** null until the user accepts the magic-link invite. */
  emailConfirmedAt: string | null;
  providerStatus: ProviderStatus | null;
  brandName: string | null;
  brandHandle: string | null;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  freeTrialEnd: string | null;
  subscriptionPeriodEnd: string | null;
  /** Business type (drives the suggested pasarela rate). */
  businessType: string | null;
  /** Per-comercio pasarela (Clinpays + bank) fee %, added to the Allons fee. */
  pasarelaFeePct: number | null;
  /** Per-comercio Allons commission %, set from the relationship. */
  allonsFeePct: number | null;
  staffRole: "scanner" | "admin" | "finance" | null;
  brandRef: string | null;
}

export function listAdminUsers() {
  return adminFetch<{ items: AdminUserRecord[] }>("/admin/users", {
    method: "GET",
  });
}

export function getAdminUser(userId: string) {
  return adminFetch<AdminUserRecord>(
    `/admin/users/${encodeURIComponent(userId)}`,
    { method: "GET" },
  );
}

export function setAdminUserSuspended(
  userId: string,
  suspend: boolean,
  actor: AdminApiActor,
) {
  return adminFetch<{ ok: true; id: string; suspended: boolean }>(
    `/admin/users/${encodeURIComponent(userId)}/suspension`,
    { method: "PATCH", body: { suspend }, actor, source: "server_action" },
  );
}
