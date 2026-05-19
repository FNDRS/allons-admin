/**
 * Payments admin API: server components call allons-api directly; client
 * components use same-origin `/api/admin/payments/*` proxies (env vars are
 * server-only in Next.js).
 */
function paymentsUrl(pathWithLeadingSlash: string, search?: URLSearchParams): string {
  const qs = search && search.toString() ? `?${search.toString()}` : "";
  if (typeof window === "undefined") {
    const base = process.env.ADMIN_API_BASE_URL?.replace(/\/+$/, "") ?? "";
    if (!base) {
      throw new Error("ADMIN_API_BASE_URL is not set");
    }
    return `${base}/admin/payments/${pathWithLeadingSlash.replace(/^\//, "")}${qs}`;
  }
  return `/api/admin/payments/${pathWithLeadingSlash.replace(/^\//, "")}${qs}`;
}

function adminHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return { "x-admin-secret": process.env.ADMIN_API_SECRET ?? "" };
  }
  return {};
}

export interface AdminPaymentsSummary {
  gmvCents: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  failedOrdersCount: number;
  stalePendingCount: number;
  daily: Array<{ date: string; totalCents: number; count: number }>;
  lastUpdated: string;
}

export interface AdminPaymentOrder {
  id: string;
  userId: string;
  eventId: string;
  amountCents: number;
  currency: string;
  status: string;
  quantity: number;
  createdAt: string;
}

export interface AdminPaymentOrdersResponse {
  total: number;
  items: AdminPaymentOrder[];
}

export async function getPaymentsSummary(): Promise<AdminPaymentsSummary> {
  const res = await fetch(paymentsUrl("summary"), {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch payments summary");
  return res.json();
}

export async function listPaymentOrders(params?: {
  status?: string;
  eventId?: string;
  startDate?: string;
  endDate?: string;
  staleMinutes?: number;
  limit?: number;
  offset?: number;
}): Promise<AdminPaymentOrdersResponse> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.eventId) qs.set("eventId", params.eventId);
  if (params?.startDate) qs.set("startDate", params.startDate);
  if (params?.endDate) qs.set("endDate", params.endDate);
  if (params?.staleMinutes !== undefined) {
    qs.set("staleMinutes", String(params.staleMinutes));
  }
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const res = await fetch(paymentsUrl("orders", qs), {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch payment orders");
  return res.json();
}

export async function overridePaymentOrder(
  orderId: string,
  status: string,
  reason: string,
): Promise<{ ok: boolean; orderId: string; status: string }> {
  const res = await fetch(
    paymentsUrl(`orders/${encodeURIComponent(orderId)}/override`),
    {
      method: "POST",
      headers: {
        ...adminHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, reason }),
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(
      typeof err === "object" && err && "message" in err
        ? String((err as { message?: string }).message)
        : "Error al sobrescribir orden",
    );
  }
  return res.json();
}
