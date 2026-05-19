"use server";

import { logAdminAudit } from "@/lib/admin/auditLog";
import { requireRootActor } from "@/lib/admin/getRootActor";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type CreateComercioState = { error: string } | null;

const ALLONS_FEE_PCT = 12;
const FREE_TRIAL_MONTHS = 6;

export async function createComercioAction(
  _prevState: CreateComercioState,
  formData: FormData,
): Promise<CreateComercioState> {
  let createdUserId: string | undefined;
  let finalBrandName: string | undefined;

  try {
    const actor = await requireRootActor();

    // ── Extract & validate fields ──
    const fullName = (formData.get("fullName") as string | null)?.trim() ?? "";
    const email = (formData.get("email") as string | null)
      ?.trim()
      .toLowerCase() ?? "";
    const phone =
      (formData.get("phone") as string | null)?.trim() || null;
    const tempPassword =
      (formData.get("tempPassword") as string | null)?.trim() ?? "";
    const brandName =
      (formData.get("brandName") as string | null)?.trim() ?? "";
    const brandHandle = (formData.get("brandHandle") as string | null)
      ?.trim()
      .replace(/^@/, "") ?? "";
    const businessType =
      (formData.get("businessType") as string | null) ?? "empresa";
    const brandColor =
      (formData.get("brandColor") as string | null)?.trim() || "#F67010";
    const paygateFeePct = Math.max(
      0,
      Math.min(
        100,
        parseFloat((formData.get("paygateFeePct") as string | null) ?? "0") ||
          0,
      ),
    );
    const subscriptionPlan =
      (formData.get("subscriptionPlan") as string | null) ?? "pendiente";
    const contractFile = formData.get("contractFile") as File | null;

    if (!fullName || !email || !tempPassword || !brandName || !brandHandle) {
      return { error: "Nombre, email, contraseña, nombre y handle son obligatorios." };
    }
    if (tempPassword.length < 8) {
      return { error: "La contraseña temporal debe tener mínimo 8 caracteres." };
    }

    finalBrandName = brandName;

    // ── Contract upload (optional) ──
    let contractUrl: string | null = null;
    if (contractFile && contractFile.size > 0) {
      const supabase = createSupabaseServiceRoleClient();
      const ext = contractFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const filename = `contract_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = await contractFile.arrayBuffer();
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("comercio-contracts")
        .upload(filename, buffer, {
          contentType: contractFile.type || "image/jpeg",
          upsert: true,
        });
      if (uploadError) {
        return { error: `Error subiendo contrato: ${uploadError.message}` };
      }
      const { data: urlData } = supabase.storage
        .from("comercio-contracts")
        .getPublicUrl(uploadData.path);
      contractUrl = urlData.publicUrl;
    }

    // ── Build user metadata ──
    const now = new Date();
    const freeTrialStart = now.toISOString();
    const freeTrialEnd = new Date(
      now.getFullYear(),
      now.getMonth() + FREE_TRIAL_MONTHS,
      now.getDate(),
    ).toISOString();

    const userMetadata: Record<string, unknown> = {
      role: "provider",
      full_name: fullName,
      phone,
      brand_name: brandName,
      brand_handle: brandHandle,
      brand_logo_color: brandColor,
      business_type: businessType,
      paygate_fee_pct: paygateFeePct,
      contract_url: contractUrl,
      subscription_plan: subscriptionPlan,
      free_trial_start: freeTrialStart,
      free_trial_end: freeTrialEnd,
      allons_fee_pct: ALLONS_FEE_PCT,
      providerStatus: "pending",
      created_by_admin: actor.email,
      created_at: now.toISOString(),
      must_change_password: true,
    };

    // ── Idempotent create / update ──
    const admin = createSupabaseServiceRoleClient();
    const { data: existingList, error: listError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listError) return { error: listError.message };

    const existing = existingList?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );

    if (existing) {
      const { data: updated, error: updateError } =
        await admin.auth.admin.updateUserById(existing.id, {
          password: tempPassword,
          user_metadata: { ...(existing.user_metadata ?? {}), ...userMetadata },
        });
      if (updateError) return { error: updateError.message };
      createdUserId = updated.user.id;
    } else {
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: userMetadata,
        });
      if (createError) return { error: createError.message };
      createdUserId = created.user.id;
    }

    await logAdminAudit({
      actor_user_id: actor.userId,
      actor_email: actor.email,
      source: "server_action",
      action: "provider.comercio_create",
      resource_type: "provider",
      resource_id: createdUserId,
      outcome: "success",
      state_after: {
        email,
        brandName,
        brandHandle,
        businessType,
        paygateFeePct,
        subscriptionPlan,
        hasContract: Boolean(contractUrl),
      },
    });
  } catch (err) {
    return {
      error: (err as Error).message ?? "Error inesperado. Intenta de nuevo.",
    };
  }

  redirect(`/providers?created=${encodeURIComponent(finalBrandName ?? "")}`);
}
