/**
 * Server-side helpers for talking to the admin endpoints in `allons-api`.
 *
 * `ADMIN_API_BASE_URL` and `ADMIN_API_SECRET` must be set in the environment
 * (server-only — never reference these from a client component).
 */

export interface AdminEventListItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  eventType: string;
  recurrence: string | null;
  startsAt: string | null;
  endsAt: string | null;
  city: string | null;
  venue: string | null;
  themeColor: string | null;
  capacity: number;
  ticketMode: string;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string | null;
    name: string | null;
    handle: string | null;
  } | null;
}

export interface AdminEventDetailItem extends AdminEventListItem {
  providerId: string | null;
  address: string | null;
  coverImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  smokingAllowed: boolean;
  petFriendly: boolean;
  parkingAvailable: boolean;
  minAge: number | null;
}

export interface AdminEventListResponse {
  total: number;
  items: AdminEventListItem[];
}

export interface AdminEventListFilters {
  q?: string;
  status?: string;
  city?: string;
  providerId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface AdminOverviewMetricsResponse {
  activeEvents: number;
  tickets30d: number;
  posthogErrors30d: number | null;
  gmv30d: number | null;
  totalEvents?: number;
}

export interface AdminPlatformStatusResponse {
  adminAuditLogsReady: boolean;
  paygate: {
    configured: boolean;
    connectivityStatus: string;
  };
  massSignupAlerts: {
    mode: 'cron';
    enabled: boolean;
    windowMinutes: number;
    threshold: number;
    cooldownMinutes: number;
    cron: string;
    recipientsConfigured: boolean;
    resendConfigured: boolean;
  };
}

const ALLOWED_STATUSES = [
  "draft",
  "published",
  "sold_out",
  "ended",
  "suspended",
] as const;
export type AdminEventStatus = (typeof ALLOWED_STATUSES)[number];

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

async function adminFetch<T>(
  path: string,
  init: RequestInit & { params?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const { baseUrl, secret } = getEnv();
  const { params, headers, ...rest } = init;

  const url = new URL(`${baseUrl}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...rest,
      cache: "no-store",
      redirect: "error",
      headers: {
        "content-type": "application/json",
        "x-admin-secret": secret,
        ...(headers ?? {}),
      },
    });
  } catch (error) {
    const code =
      error instanceof Error && "cause" in error
        ? (error.cause as { code?: string } | undefined)?.code
        : undefined;
    if (code === "ECONNREFUSED") {
      throw new Error(
        `Cannot reach allons-api at ${baseUrl}. Start it with \`pnpm dev\` in allons-api.`,
      );
    }
    throw error;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text().catch(() => "");

  if (!response.ok) {
    throw new Error(
      `Admin API ${path} failed (${response.status}): ${text || response.statusText}`,
    );
  }

  if (!contentType.includes("application/json")) {
    const hint =
      baseUrl.includes("localhost:3001") || baseUrl.includes("localhost:3000")
        ? " ADMIN_API_BASE_URL must point at allons-api (default :3000), not allons-admin."
        : "";
    throw new Error(
      `Admin API ${path} returned non-JSON (${contentType || "unknown"}).${hint}`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Admin API ${path} returned invalid JSON. Check ADMIN_API_BASE_URL (${baseUrl}).`,
    );
  }
}

export function listAdminEvents(filters: AdminEventListFilters = {}) {
  return adminFetch<AdminEventListResponse>("/admin/events", {
    method: "GET",
    params: {
      q: filters.q,
      status: filters.status,
      city: filters.city,
      providerId: filters.providerId,
      from: filters.from,
      to: filters.to,
      limit: filters.limit,
    },
  });
}

export function getAdminEvent(id: string) {
  return adminFetch<AdminEventDetailItem>(
    `/admin/events/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
}

export function updateAdminEventStatus(id: string, status: AdminEventStatus) {
  return adminFetch<{ ok: true; id: string; status: string }>(
    `/admin/events/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function getAdminOverviewMetrics() {
  return adminFetch<AdminOverviewMetricsResponse>("/admin/overview-metrics", {
    method: "GET",
  });
}

export function getAdminPlatformStatus() {
  return adminFetch<AdminPlatformStatusResponse>("/admin/platform-status", {
    method: "GET",
  });
}

export function isValidAdminEventStatus(value: string): value is AdminEventStatus {
  return (ALLOWED_STATUSES as readonly string[]).includes(value);
}
