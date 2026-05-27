function payoutsSegmentUrl(segment: string, search?: URLSearchParams): string {
  const qs = search && search.toString() ? `?${search.toString()}` : "";
  const path = segment.replace(/^\//, "");
  if (typeof window === "undefined") {
    const base = process.env.ADMIN_API_BASE_URL?.replace(/\/+$/, "") ?? "";
    if (!base) {
      throw new Error("ADMIN_API_BASE_URL is not set");
    }
    return `${base}/admin/payouts/${path}${qs}`;
  }
  return `/api/admin/payouts/${path}${qs}`;
}

function adminHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return { "x-admin-secret": process.env.ADMIN_API_SECRET ?? "" };
  }
  return {};
}

export interface AdminPayoutRow {
  id: string;
  providerId: string;
  providerName: string;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
}

export interface AdminPayoutsRecentResponse {
  items: AdminPayoutRow[];
}

export async function getRecentPayouts(limit = 20): Promise<AdminPayoutsRecentResponse> {
  const qs = new URLSearchParams();
  qs.set("limit", String(limit));
  const res = await fetch(payoutsSegmentUrl("recent", qs), {
    headers: adminHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Failed to fetch payouts (${res.status})${detail ? `: ${detail.slice(0, 120)}` : ""}`,
    );
  }
  return res.json();
}

export interface CompletePayoutResponse {
  id: string;
  status: string;
}

/** Marks a pending payout as completed (after the operator made the transfer). */
export async function completePayout(
  id: string,
): Promise<CompletePayoutResponse> {
  const res = await fetch(
    payoutsSegmentUrl(`${encodeURIComponent(id)}/complete`),
    {
      method: "POST",
      headers: { ...adminHeaders(), "Content-Type": "application/json" },
      body: "{}",
      cache: "no-store",
    },
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `No se pudo completar el retiro (${res.status})${detail ? `: ${detail.slice(0, 160)}` : ""}`,
    );
  }
  return res.json();
}
