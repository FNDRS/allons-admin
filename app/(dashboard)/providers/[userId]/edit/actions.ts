"use server";

import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { requireRootActor } from "@/lib/admin/getRootActor";
import { updateProviderApi } from "@/lib/admin/providersApi";
import { DEFAULT_ALLONS_FEE } from "@/lib/commissionTiers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type EditProviderValues = {
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

export type EditProviderState = {
  error: string;
  values: EditProviderValues;
} | null;

function readFormValues(formData: FormData): EditProviderValues {
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

export async function updateProviderAction(
  userId: string,
  _prev: EditProviderState,
  formData: FormData,
): Promise<EditProviderState> {
  const values = readFormValues(formData);

  if (
    !values.fullName ||
    !values.email ||
    !values.brandName ||
    !values.brandHandle
  ) {
    return {
      error: "Nombre, email, nombre del negocio y handle son obligatorios.",
      values,
    };
  }

  try {
    const actor = await requireRootActor();
    await updateProviderApi(
      userId,
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
  } catch (error) {
    return {
      error: adminApiErrorMessage(error, "No se pudo guardar el proveedor."),
      values,
    };
  }

  revalidatePath(`/providers/${userId}`);
  revalidatePath("/providers");
  redirect(`/providers/${userId}`);
}
