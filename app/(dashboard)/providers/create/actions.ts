"use server";

import { logAdminAudit } from "@/lib/admin/auditLog";
import { requireRootActor } from "@/lib/admin/getRootActor";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type CreateComercioFormValues = {
  fullName: string;
  email: string;
  phone: string;
  brandName: string;
  brandHandle: string;
  businessType: string;
  brandColor: string;
  paygateFeePct: string;
  subscriptionPlan: string;
};

export type CreateComercioState = {
  error: string;
  values: CreateComercioFormValues;
} | null;

const ALLONS_FEE_PCT = 12;
const FREE_TRIAL_MONTHS = 6;

function readFormValues(formData: FormData): CreateComercioFormValues {
  return {
    fullName: (formData.get("fullName") as string | null)?.trim() ?? "",
    email: (formData.get("email") as string | null)?.trim() ?? "",
    phone: (formData.get("phone") as string | null)?.trim() ?? "",
    brandName: (formData.get("brandName") as string | null)?.trim() ?? "",
    brandHandle:
      (formData.get("brandHandle") as string | null)
        ?.trim()
        .replace(/^@/, "") ?? "",
    businessType:
      (formData.get("businessType") as string | null) ?? "empresa",
    brandColor:
      (formData.get("brandColor") as string | null)?.trim() || "#F67010",
    paygateFeePct:
      (formData.get("paygateFeePct") as string | null)?.trim() || "5",
    subscriptionPlan:
      (formData.get("subscriptionPlan") as string | null) ?? "pendiente",
  };
}

function fail(formData: FormData, error: string): CreateComercioState {
  return { error, values: readFormValues(formData) };
}

export async function createComercioAction(
  _prevState: CreateComercioState,
  formData: FormData,
): Promise<CreateComercioState> {
  let createdUserId: string | undefined;
  let finalBrandName: string | undefined;
  let inviteStatus: "invited" | "existing" = "invited";

  try {
    const actor = await requireRootActor();
    const values = readFormValues(formData);

    // ── Extract & validate fields ──
    const fullName = values.fullName;
    const email = values.email.toLowerCase();
    const phone = values.phone || null;
    const brandName = values.brandName;
    const brandHandle = values.brandHandle;
    const businessType = values.businessType;
    const brandColor = values.brandColor;
    const paygateFeePct = Math.max(
      0,
      Math.min(100, parseFloat(values.paygateFeePct) || 0),
    );
    const subscriptionPlan = values.subscriptionPlan;
    const contractFile = formData.get("contractFile") as File | null;

    if (!fullName || !email || !brandName || !brandHandle) {
      return fail(
        formData,
        "Nombre, email, nombre del negocio y handle son obligatorios.",
      );
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
        return fail(
          formData,
          `Error subiendo contrato: ${uploadError.message}`,
        );
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
      // Read by allons-mobile `lib/role.ts` to force `/(auth)/set-password`
      // on first sign-in (since the invite link logs the user in without a
      // password). Cleared by the set-password screen after the comercio
      // sets one.
      mustSetPassword: true,
      comercio_role: "admin",
      created_by_admin: actor.email,
      created_at: now.toISOString(),
    };

    const admin = createSupabaseServiceRoleClient();
    const { data: existingList, error: listError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listError) return fail(formData, listError.message);

    const existing = existingList?.users?.find(
      (u) => u.email?.toLowerCase() === email,
    );

    if (existing) {
      // Existing user: keep idempotent. Only merge metadata — don't re-send an
      // invite, since they already have an account / set a password.
      const { data: updated, error: updateError } =
        await admin.auth.admin.updateUserById(existing.id, {
          user_metadata: { ...(existing.user_metadata ?? {}), ...userMetadata },
        });
      if (updateError) return fail(formData, updateError.message);
      createdUserId = updated.user.id;
      inviteStatus = "existing";
    } else {
      // `redirectTo` must point at the mobile app's deep link so the invite
      // email opens Allons and the `code=` param can be exchanged for a
      // session. Without it, Supabase falls back to the project Site URL
      // (`https://allonsapp.com`) and the comercio lands on the marketing
      // site, where there is no set-password UI.
      //
      //   Production / dev client builds : `allons://`
      //   Expo Go on a phone (dev)       : `exp://<LAN_IP>:8081/--/`
      //   Web (`expo start --web`)       : `http://localhost:8081`
      //
      // Override per environment via `APP_INVITE_REDIRECT_URL` env var.
      const redirectTo = process.env.APP_INVITE_REDIRECT_URL ?? "allons://";

      const { data: invited, error: inviteError } =
        await admin.auth.admin.inviteUserByEmail(email, {
          data: userMetadata,
          redirectTo,
        });
      if (inviteError) return fail(formData, inviteError.message);
      createdUserId = invited.user.id;
      inviteStatus = "invited";
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
        invite: inviteStatus,
      },
    });
  } catch (err) {
    return fail(
      formData,
      (err as Error).message ?? "Error inesperado. Intenta de nuevo.",
    );
  }

  redirect(
    `/providers?created=${encodeURIComponent(finalBrandName ?? "")}&invite=${inviteStatus}`,
  );
}
