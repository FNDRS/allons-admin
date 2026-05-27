import "server-only";

/**
 * Subscription invoices admin API. Server-only (server components + server
 * actions) — calls allons-api `/admin/invoices` with the shared admin secret.
 */
function getEnv() {
  const baseUrl = process.env.ADMIN_API_BASE_URL;
  const secret = process.env.ADMIN_API_SECRET;
  if (!baseUrl) {
    throw new Error(
      "ADMIN_API_BASE_URL is not set. Point it at your allons-api deployment.",
    );
  }
  if (!secret) {
    throw new Error(
      "ADMIN_API_SECRET is not set. It must match ADMIN_API_SECRET in allons-api.",
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), secret };
}

function invoicesUrl(path: string, search?: URLSearchParams): string {
  const { baseUrl } = getEnv();
  const qs = search && search.toString() ? `?${search.toString()}` : "";
  return `${baseUrl}/admin/invoices${path}${qs}`;
}

function adminHeaders(): HeadersInit {
  const { secret } = getEnv();
  return {
    "x-admin-secret": secret,
    "Content-Type": "application/json",
  };
}

export type InvoiceStatus = "pending" | "paid" | "void";

export interface ProviderInvoice {
  id: string;
  invoiceNumber: string;
  providerId: string;
  userId: string;
  planId: string;
  billingInterval: string;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  prorated: boolean;
  periodStart: string;
  periodEnd: string;
  notes: string | null;
  issuedAt: string;
  dueAt: string | null;
  paidAt: string | null;
}

export interface InvoiceListResponse {
  items: ProviderInvoice[];
  totals: {
    paidCents: number;
    pendingCents: number;
    paidCount: number;
    pendingCount: number;
  };
}

async function asError(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  throw new Error(body.message ?? `${fallback} (${res.status})`);
}

export async function listInvoices(params?: {
  status?: string;
}): Promise<InvoiceListResponse> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  const res = await fetch(invoicesUrl("", search), {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (!res.ok) await asError(res, "No se pudieron cargar las facturas");
  return res.json();
}

export async function generateInvoice(body: {
  userId: string;
  planId: string;
  prorate?: boolean;
  notes?: string;
  createdBy?: string;
}): Promise<ProviderInvoice> {
  const res = await fetch(invoicesUrl(""), {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await asError(res, "No se pudo generar la factura");
  return res.json();
}

export async function payInvoice(id: string): Promise<ProviderInvoice> {
  const res = await fetch(invoicesUrl(`/${encodeURIComponent(id)}/pay`), {
    method: "POST",
    headers: adminHeaders(),
  });
  if (!res.ok) await asError(res, "No se pudo marcar como pagada");
  return res.json();
}

export async function voidInvoice(id: string): Promise<ProviderInvoice> {
  const res = await fetch(invoicesUrl(`/${encodeURIComponent(id)}/void`), {
    method: "POST",
    headers: adminHeaders(),
  });
  if (!res.ok) await asError(res, "No se pudo anular la factura");
  return res.json();
}
