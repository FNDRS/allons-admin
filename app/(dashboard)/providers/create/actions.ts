"use server";

import { logAdminAudit } from "@/lib/admin/auditLog";
import { sendComercioInviteEmail } from "@/lib/admin/comercioInviteMail";
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
  subscriptionPlan: string;
};

export type CreateComercioState = {
  error: string;
  values: CreateComercioFormValues;
} | null;

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
      contract_url: contractUrl,
      subscription_plan: subscriptionPlan,
      free_trial_start: freeTrialStart,
      free_trial_end: freeTrialEnd,
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
      // Refuse to re-create if this email already owns a comercio. Updating
      // metadata for a confirmed user doesn't send a new invite email and
      // produces duplicate provider rows in the API, so this branch is
      // almost never what you want; bounce it with a clear message.
      const existingMeta = (existing.user_metadata ?? {}) as Record<
        string,
        unknown
      >;
      if (
        existingMeta.role === "provider" &&
        existing.email_confirmed_at
      ) {
        return fail(
          formData,
          `Ya existe un comercio activo con ${email}. Si necesitas reasignarlo, edítalo desde la lista en lugar de crear uno nuevo.`,
        );
      }

      // Pending user (invited but never confirmed): refresh the metadata so
      // a re-send of the invite carries the latest brand info.
      const { data: updated, error: updateError } =
        await admin.auth.admin.updateUserById(existing.id, {
          user_metadata: { ...existingMeta, ...userMetadata },
        });
      if (updateError) return fail(formData, updateError.message);
      createdUserId = updated.user.id;
      inviteStatus = "existing";
    } else {
      // Invite email is sent via Resend (lib/admin/comercioInviteMail.ts), not
      // Supabase's built-in template — so links always use allonsapp.com.
      const invited = await sendComercioInviteEmail({
        email,
        metadata: userMetadata,
      });
      if (invited.error || !invited.userId) {
        return fail(
          formData,
          invited.error ?? "No se pudo crear la invitación del comercio.",
        );
      }
      if (!invited.emailSent) {
        return fail(
          formData,
          invited.error ?? "No se pudo enviar el correo de invitación.",
        );
      }
      createdUserId = invited.userId;
      inviteStatus = "invited";
    }

    // Provision the API rows up front so allons-api never auto-creates a
    // provider with `name='Mi comercio'` + `handle=NULL` (the legacy
    // `ensureDefaultMembership` fallback). Doing it here, atomically, also
    // prevents the race that produced 4 duplicate provider rows when several
    // mobile requests landed before the membership row was committed.
    if (!createdUserId) {
      return fail(formData, "No se pudo obtener el ID del comercio creado.");
    }

    const { data: existingMembership, error: membershipLookupError } =
      await admin
        .from("provider_members")
        .select("provider_id, role")
        .eq("user_id", createdUserId)
        .in("role", ["owner", "admin"])
        .limit(1)
        .maybeSingle();
    if (membershipLookupError) {
      return fail(formData, membershipLookupError.message);
    }

    let providerId = existingMembership?.provider_id ?? null;

    if (providerId) {
      // Pre-existing comercio (re-invite flow): keep the same provider row
      // but make sure name / handle reflect the latest form values.
      const { error: providerUpdateError } = await admin
        .from("providers")
        .update({ name: brandName, handle: brandHandle })
        .eq("id", providerId);
      if (providerUpdateError) {
        return fail(formData, providerUpdateError.message);
      }
    } else {
      const { data: provider, error: providerInsertError } = await admin
        .from("providers")
        .insert({ name: brandName, handle: brandHandle })
        .select("id")
        .single();
      if (providerInsertError || !provider) {
        return fail(
          formData,
          providerInsertError?.message ?? "No se pudo crear el provider.",
        );
      }
      providerId = provider.id;

      const { error: memberInsertError } = await admin
        .from("provider_members")
        .insert({
          provider_id: providerId,
          user_id: createdUserId,
          role: "owner",
          active: true,
          full_name: fullName,
          email,
          phone,
        });
      if (memberInsertError) {
        // Roll back the providers row so we don't leak orphaned brands.
        await admin.from("providers").delete().eq("id", providerId);
        return fail(formData, memberInsertError.message);
      }
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
