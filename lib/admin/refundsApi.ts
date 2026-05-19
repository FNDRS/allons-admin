function refundsUrl(segment: string, search?: URLSearchParams): string {
  const qs = search && search.toString() ? `?${search.toString()}` : "";
  const path = segment.replace(/^\//, "");
  if (typeof window === "undefined") {
    const base = process.env.ADMIN_API_BASE_URL?.replace(/\/+$/, "") ?? "";
    if (!base) {
      throw new Error("ADMIN_API_BASE_URL is not set");
    }
    const tail = path ? `/${path}` : "";
    return `${base}/admin/refunds${tail}${qs}`;
  }
  const tail = path ? `/${path}` : "";
  return `/api/admin/refunds${tail}${qs}`;
}

function adminHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return { "x-admin-secret": process.env.ADMIN_API_SECRET ?? "" };
  }
  return {};
}

export type AdminRefundStatus =
  | "requested"
  | "skipped_policy"
  | "approved"
  | "paid"
  | "denied"
  | "failed";

export interface AdminRefundRow {
  id: string;
  paymentOrderId: string;
  ticketId: string | null;
  userId: string;
  amountCents: number;
  currency: string;
  reason: string;
  status: AdminRefundStatus;
  policyEligibleAtRequest: boolean;
  policyDeadlineHoursAtRequest: number | null;
  paygatePaymentId: string | null;
  notes: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}

export interface AdminRefundsListResponse {
  total: number;
  items: AdminRefundRow[];
}

export interface AdminRefundsSummary {
  total: number;
  byStatus: Partial<Record<AdminRefundStatus, number>>;
  paidLast30dCents: number;
  lastUpdated: string;
}

export async function getRefundsSummary(): Promise<AdminRefundsSummary> {
  const res = await fetch(refundsUrl("summary"), {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch refunds summary (${res.status})`);
  }
  return res.json();
}

export async function listRefunds(params?: {
  status?: AdminRefundStatus;
  limit?: number;
  offset?: number;
}): Promise<AdminRefundsListResponse> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.offset) qs.set("offset", String(params.offset));
  const res = await fetch(refundsUrl("", qs), {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch refunds (${res.status})`);
  }
  return res.json();
}
