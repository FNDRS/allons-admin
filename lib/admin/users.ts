import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type AppRole = "client" | "provider" | "staff";
export type ProviderStatus = "pending" | "approved" | "paused" | "suspended";
export type UserStatus = "active" | "suspended";

export interface AdminUserRecord {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  /** Supabase ban window — present means currently banned. */
  bannedUntil: string | null;
  status: UserStatus;
  createdAt: string;
  lastSignInAt: string | null;
  /** null until the user accepts the magic-link invite. */
  emailConfirmedAt: string | null;
  // Provider-specific:
  providerStatus?: ProviderStatus;
  brandName?: string | null;
  brandHandle?: string | null;
  /** Subscription canonical state (owner metadata). */
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  freeTrialEnd?: string | null;
  subscriptionPeriodEnd?: string | null;
  /** Business type (drives the suggested pasarela rate). */
  businessType?: string | null;
  /** Per-comercio pasarela (Clinpays + bank) fee %, added to the base commission. */
  pasarelaFeePct?: number | null;
  // Staff-specific:
  staffRole?: "scanner" | "admin" | "finance" | null;
  brandRef?: string | null;
}

function deriveRole(metadata: Record<string, unknown> | null | undefined): AppRole {
  const role = metadata?.role;
  if (role === "provider") return "provider";
  if (role === "staff") return "staff";
  return "client";
}

function deriveProviderStatus(
  metadata: Record<string, unknown> | null | undefined,
): ProviderStatus {
  const status = metadata?.providerStatus;
  if (status === "approved") return "approved";
  if (status === "paused") return "paused";
  if (status === "suspended") return "suspended";
  return "pending";
}

function isBanned(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false;
  const ts = new Date(bannedUntil).getTime();
  if (Number.isNaN(ts)) return false;
  return ts > Date.now();
}

function toRecord(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  banned_until?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
}): AdminUserRecord {
  const metadata = user.user_metadata ?? null;
  const role = deriveRole(metadata);
  const banned = isBanned(user.banned_until ?? null);

  return {
    id: user.id,
    email: user.email ?? "(sin email)",
    fullName:
      ((metadata?.full_name as string | undefined) ??
        (metadata?.name as string | undefined) ??
        null) ||
      null,
    role,
    bannedUntil: user.banned_until ?? null,
    status: banned ? "suspended" : "active",
    createdAt: user.created_at ?? new Date(0).toISOString(),
    lastSignInAt: user.last_sign_in_at ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
    providerStatus: role === "provider" ? deriveProviderStatus(metadata) : undefined,
    brandName: (metadata?.brand_name as string | undefined) ?? null,
    brandHandle: (metadata?.brand_handle as string | undefined) ?? null,
    subscriptionPlan:
      role === "provider"
        ? ((metadata?.subscription_plan as string | undefined) ?? null)
        : null,
    subscriptionStatus:
      role === "provider"
        ? ((metadata?.subscription_status as string | undefined) ?? null)
        : null,
    freeTrialEnd:
      role === "provider"
        ? ((metadata?.free_trial_end as string | undefined) ?? null)
        : null,
    subscriptionPeriodEnd:
      role === "provider"
        ? ((metadata?.subscription_period_end as string | undefined) ?? null)
        : null,
    businessType:
      role === "provider"
        ? ((metadata?.business_type as string | undefined) ?? null)
        : null,
    pasarelaFeePct:
      role === "provider"
        ? (typeof metadata?.paygate_fee_pct === "number"
            ? (metadata.paygate_fee_pct as number)
            : null)
        : null,
    staffRole:
      role === "staff"
        ? ((metadata?.staff_role as AdminUserRecord["staffRole"]) ?? null)
        : null,
    brandRef:
      role === "staff"
        ? ((metadata?.brand_name as string | undefined) ?? null)
        : null,
  };
}

/** GoTrue listUsers breaks when auth.users token columns are NULL. Repair first. */
async function repairAuthUsersForListing(
  admin: ReturnType<typeof createSupabaseServiceRoleClient>,
): Promise<void> {
  const { error } = await admin.rpc("repair_auth_users_token_nulls");
  if (error && error.code !== "PGRST202") {
    // PGRST202 = function not found (migration not deployed yet).
    console.warn("[admin/users] repair_auth_users_token_nulls:", error.message);
  }
}

export async function getUserById(userId: string): Promise<AdminUserRecord | null> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  return toRecord(data.user);
}

export async function listAllUsers(): Promise<AdminUserRecord[]> {
  const admin = createSupabaseServiceRoleClient();
  await repairAuthUsersForListing(admin);
  const all: AdminUserRecord[] = [];
  const perPage = 200;
  let page = 1;
  // Cap at 5k to avoid runaway loops; raise once an aggregated table exists.
  while (page <= 25) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    if (!data?.users || data.users.length === 0) break;
    for (const user of data.users) all.push(toRecord(user));
    if (data.users.length < perPage) break;
    page += 1;
  }
  return all;
}
