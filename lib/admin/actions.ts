"use server";

import { isRootEmail } from "@/lib/role";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { ProviderStatus } from "./users";

async function requireRoot() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isRootEmail(user.email)) {
    throw new Error("No autorizado");
  }
  return user;
}

const BAN_FOREVER = "876600h"; // 100 years — Supabase requires a finite duration.

export async function setUserSuspended(formData: FormData) {
  await requireRoot();
  const userId = String(formData.get("userId") ?? "");
  const suspend = String(formData.get("suspend") ?? "true") === "true";
  const revalidate = String(formData.get("revalidate") ?? "/users");

  if (!userId) throw new Error("userId requerido");

  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? BAN_FOREVER : "none",
  });
  if (error) throw new Error(error.message);

  revalidatePath(revalidate);
}

export async function setProviderStatusAction(formData: FormData) {
  const caller = await requireRoot();
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

  const merged = {
    ...(existing.user.user_metadata ?? {}),
    providerStatus: status,
    providerStatusUpdatedBy: caller.id,
    providerStatusUpdatedAt: new Date().toISOString(),
  };
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: merged,
    ban_duration: status === "suspended" ? BAN_FOREVER : "none",
  });
  if (updateError) throw new Error(updateError.message);

  revalidatePath(revalidate);
}
