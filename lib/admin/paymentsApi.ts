export interface AdminPaymentsSummary {
  gmvCents: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  failedOrdersCount: number;
  stalePendingCount: number;
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
  const res = await fetch(
    `${process.env.ADMIN_API_BASE_URL}/admin/payments/summary`,
    { headers: { "x-admin-secret": process.env.ADMIN_API_SECRET ?? "" } },
  );
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
  if (params?.staleMinutes) qs.set("staleMinutes", String(params.staleMinutes));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const res = await fetch(
    `${process.env.ADMIN_API_BASE_URL}/admin/payments/orders?${qs.toString()}`,
    { headers: { "x-admin-secret": process.env.ADMIN_API_SECRET ?? "" } },
  );
  if (!res.ok) throw new Error("Failed to fetch payment orders");
  return res.json();
}

export async function overridePaymentOrder(
  orderId: string,
  status: string,
  reason: string,
): Promise<{ ok: boolean; orderId: string; status: string }> {
  const res = await fetch(
    `${process.env.ADMIN_API_BASE_URL}/admin/payments/orders/${orderId}/override`,
    {
      method: "POST",
      headers: {
        "x-admin-secret": process.env.ADMIN_API_SECRET ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, reason }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? "Error al sobrescribir orden");
  }
  return res.json();
}
