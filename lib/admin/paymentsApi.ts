import type { AdminApiResponse } from "./actions";

export interface AdminPaymentsSummary {
  gmvCents: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  failedOrdersCount: number;
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
  limit?: number;
  offset?: number;
}): Promise<AdminPaymentOrdersResponse> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.eventId) qs.set("eventId", params.eventId);
  if (params?.startDate) qs.set("startDate", params.startDate);
  if (params?.endDate) qs.set("endDate", params.endDate);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const res = await fetch(
    `${process.env.ADMIN_API_BASE_URL}/admin/payments/orders?${qs.toString()}`,
    { headers: { "x-admin-secret": process.env.ADMIN_API_SECRET ?? "" } },
  );
  if (!res.ok) throw new Error("Failed to fetch payment orders");
  return res.json();
}
