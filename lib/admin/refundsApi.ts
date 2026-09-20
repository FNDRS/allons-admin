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

/**
 * Which moves the UI may offer from a given status. Mirrors the API's own
 * table, which is the one that enforces it — this copy only decides which
 * buttons to draw, so a stale one is a missing button rather than a bad write.
 *
 * `skipped_policy` and `denied` have no rows on purpose: both record a
 * decision, and reversing one is a new refund, not an edit of the old.
 */
export const REFUND_NEXT_STATUSES: Record<
  AdminRefundStatus,
  AdminRefundStatus[]
> = {
  requested: ["approved", "paid", "denied", "failed"],
  approved: ["paid", "denied", "failed"],
  failed: ["approved", "paid", "denied"],
  paid: [],
  denied: [],
  skipped_policy: [],
};

/**
 * Records what a person did with a refund.
 *
 * Marking one `paid` does not move money — there is no partial-refund API at
 * the gateway, so the transfer happens outside Allons and this is the record
 * that it did. It is also what notifies the customer, so it should be pressed
 * after the transfer, not before.
 */
export async function resolveRefund(
  id: string,
  status: AdminRefundStatus,
  note?: string,
): Promise<AdminRefundRow> {
  const res = await fetch(refundsUrl(id), {
    method: "PATCH",
    headers: { ...adminHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ status, note }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { message?: string });
    throw new Error(
      body?.message ?? `No se pudo actualizar el reembolso (${res.status})`,
    );
  }
  return res.json();
}
