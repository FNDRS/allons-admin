function requestsUrl(segment = "", search?: URLSearchParams): string {
  const qs = search && search.toString() ? `?${search.toString()}` : "";
  const path = segment.replace(/^\//, "");
  const tail = path ? `/${path}` : "";
  if (typeof window === "undefined") {
    const base = process.env.ADMIN_API_BASE_URL?.replace(/\/+$/, "") ?? "";
    if (!base) throw new Error("ADMIN_API_BASE_URL is not set");
    return `${base}/admin/refund-requests${tail}${qs}`;
  }
  return `/api/admin/refund-requests${tail}${qs}`;
}

function adminHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return { "x-admin-secret": process.env.ADMIN_API_SECRET ?? "" };
  }
  return {};
}

export type RefundRequestStatus = "pending" | "approved" | "rejected";

export interface AdminRefundRequestRow {
  id: string;
  status: RefundRequestStatus;
  subject: string;
  reason: string;
  userEmail: string;
  userName: string | null;
  eventId: string | null;
  eventTitle: string | null;
  ticketId: string | null;
  ticketCode: string | null;
  ticketCancelled: boolean;
  resolutionNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  /** `false` significa que la fila es la única copia: no salió el correo. */
  emailDelivered: boolean;
  createdAt: string;
}

export async function listRefundRequests(status?: string) {
  const search = new URLSearchParams();
  if (status) search.set("status", status);
  const res = await fetch(requestsUrl("", search), {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`refund requests failed (${res.status})`);
  return (await res.json()) as { items: AdminRefundRequestRow[] };
}
