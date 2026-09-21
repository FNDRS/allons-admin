"use server";

import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { requireRootActor } from "@/lib/admin/getRootActor";
import { createComercioApi } from "@/lib/admin/providersApi";
import { DEFAULT_ALLONS_FEE } from "@/lib/commissionTiers";
import { redirect } from "next/navigation";

export type CreateComercioFormValues = {
  fullName: string;
  email: string;
  phone: string;
  brandName: string;
  brandHandle: string;
  brandDescription: string;
  websiteUrl: string;
  businessType: string;
  brandColor: string;
  pasarelaFeePct: string;
  allonsFeePct: string;
};

export type CreateComercioState = {
  error: string;
  values: CreateComercioFormValues;
} | null;

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
    brandDescription:
      (formData.get("brandDescription") as string | null)?.trim() ?? "",
    websiteUrl: (formData.get("websiteUrl") as string | null)?.trim() ?? "",
    businessType: (formData.get("businessType") as string | null) ?? "empresa",
    brandColor:
      (formData.get("brandColor") as string | null)?.trim() || "#F67010",
    pasarelaFeePct:
      (formData.get("pasarelaFeePct") as string | null)?.trim() || "5",
    allonsFeePct:
      (formData.get("allonsFeePct") as string | null)?.trim() ||
      String(DEFAULT_ALLONS_FEE),
  };
}

function fail(formData: FormData, error: string): CreateComercioState {
  return { error, values: readFormValues(formData) };
}

/**
 * Crea el comercio: cuenta invitada, filas de `providers` y de membresía, y la
 * línea de auditoría. Todo eso lo hace `allons-api` en una sola llamada, que es
 * lo que evita que una invitación enviada quede sin comercio detrás.
 */
export async function createComercioAction(
  _prevState: CreateComercioState,
  formData: FormData,
): Promise<CreateComercioState> {
  let brandName: string;
  let invite: "invited" | "existing";

  try {
    const actor = await requireRootActor();
    const values = readFormValues(formData);

    if (
      !values.fullName ||
      !values.email ||
      !values.brandName ||
      !values.brandHandle
    ) {
      return fail(
        formData,
        "Nombre, email, nombre del negocio y handle son obligatorios.",
      );
    }

    // El navegador ya subió logo y contrato por `/api/admin/uploads`: por el
    // Server Action sólo viajan sus URLs, porque Next corta ese body a 1 MB.
    const created = await createComercioApi(
      {
        fullName: values.fullName,
        email: values.email.toLowerCase(),
        phone: values.phone || null,
        brandName: values.brandName,
        brandHandle: values.brandHandle,
        brandDescription: values.brandDescription || null,
        websiteUrl: values.websiteUrl || null,
        businessType: values.businessType,
        brandColor: values.brandColor,
        pasarelaFeePct: values.pasarelaFeePct,
        allonsFeePct: values.allonsFeePct,
        logoUrl: (formData.get("logoUrl") as string | null)?.trim() || null,
        contractUrl:
          (formData.get("contractUrl") as string | null)?.trim() || null,
      },
      actor,
    );

    brandName = created.brandName;
    invite = created.invite;
  } catch (error) {
    return fail(
      formData,
      adminApiErrorMessage(error, "Error inesperado. Intenta de nuevo."),
    );
  }

  redirect(
    `/providers?created=${encodeURIComponent(brandName)}&invite=${invite}`,
  );
}
