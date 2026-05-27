import "server-only";

/**
 * Read-only subscription payments. Server-only — calls allons-api
 * `/admin/subscription-orders` with the shared admin secret.
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

export type PaymentOrderStatus =
  | "pending_payment"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

export interface SubscriptionOrder {
  id: string;
  userId: string;
  providerId: string;
  planId: string;
  amountCents: number;
  currency: string;
  status: PaymentOrderStatus;
  periodEnd: string | null;
  createdAt: string;
}

export interface SubscriptionOrdersResponse {
  items: SubscriptionOrder[];
  totals: { paidCents: number; paidCount: number; pendingCount: number };
}

export async function listSubscriptionOrders(params?: {
  status?: string;
}): Promise<SubscriptionOrdersResponse> {
  const { baseUrl, secret } = getEnv();
  const qs = params?.status
    ? `?status=${encodeURIComponent(params.status)}`
    : "";
  const res = await fetch(`${baseUrl}/admin/subscription-orders${qs}`, {
    headers: { "x-admin-secret": secret },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(
      body.message ?? `No se pudieron cargar los pagos (${res.status})`,
    );
  }
  return res.json();
}
