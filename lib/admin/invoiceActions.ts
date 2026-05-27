"use server";

import { logAdminAudit } from "@/lib/admin/auditLog";
import { requireRootActor } from "@/lib/admin/getRootActor";
import {
  generateInvoice,
  payInvoice,
  voidInvoice,
} from "@/lib/admin/invoicesApi";
import { revalidatePath } from "next/cache";

const PLAN_VALUES = ["single_event", "basico", "pro"];

export async function generateInvoiceAction(formData: FormData) {
  const caller = await requireRootActor();
  const userId = String(formData.get("userId") ?? "");
  const planId = String(formData.get("planId") ?? "");
  const prorate = String(formData.get("prorate") ?? "") === "on";
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  if (!userId || !PLAN_VALUES.includes(planId)) {
    throw new Error("Comercio y plan son obligatorios");
  }

  try {
    const inv = await generateInvoice({
      userId,
      planId,
      prorate,
      notes,
      createdBy: caller.userId,
    });

    await logAdminAudit({
      actor_user_id: caller.userId,
      actor_email: caller.email,
      source: "server_action",
      action: "invoice.generate",
      resource_type: "provider_invoice",
      resource_id: inv.id,
      outcome: "success",
      state_after: {
        invoiceNumber: inv.invoiceNumber,
        planId,
        amountCents: inv.amountCents,
        prorated: inv.prorated,
      },
    });

    revalidatePath("/invoices");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo generar la factura";
    await logAdminAudit({
      actor_user_id: caller.userId,
      actor_email: caller.email,
      source: "server_action",
      action: "invoice.generate",
      resource_type: "provider_invoice",
      resource_id: userId,
      outcome: "failure",
      state_after: { planId, prorate },
      error_message: message,
    });
    throw err;
  }
}

export async function markInvoicePaidAction(formData: FormData) {
  const caller = await requireRootActor();
  const id = String(formData.get("invoiceId") ?? "");
  if (!id) throw new Error("invoiceId requerido");

  try {
    const inv = await payInvoice(id);

    await logAdminAudit({
      actor_user_id: caller.userId,
      actor_email: caller.email,
      source: "server_action",
      action: "invoice.paid",
      resource_type: "provider_invoice",
      resource_id: id,
      outcome: "success",
      state_after: { invoiceNumber: inv.invoiceNumber, planId: inv.planId },
    });

    revalidatePath("/invoices");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo marcar como pagada";
    await logAdminAudit({
      actor_user_id: caller.userId,
      actor_email: caller.email,
      source: "server_action",
      action: "invoice.paid",
      resource_type: "provider_invoice",
      resource_id: id,
      outcome: "failure",
      error_message: message,
    });
    throw err;
  }
}

export async function voidInvoiceAction(formData: FormData) {
  const caller = await requireRootActor();
  const id = String(formData.get("invoiceId") ?? "");
  if (!id) throw new Error("invoiceId requerido");

  try {
    await voidInvoice(id);

    await logAdminAudit({
      actor_user_id: caller.userId,
      actor_email: caller.email,
      source: "server_action",
      action: "invoice.void",
      resource_type: "provider_invoice",
      resource_id: id,
      outcome: "success",
    });

    revalidatePath("/invoices");
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "No se pudo anular la factura";
    await logAdminAudit({
      actor_user_id: caller.userId,
      actor_email: caller.email,
      source: "server_action",
      action: "invoice.void",
      resource_type: "provider_invoice",
      resource_id: id,
      outcome: "failure",
      error_message: message,
    });
    throw err;
  }
}
