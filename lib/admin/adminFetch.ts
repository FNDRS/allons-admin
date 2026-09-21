import "server-only";

/**
 * The one way this panel reaches `allons-api`.
 *
 * Since the panel no longer holds a Supabase service-role key, every read and
 * every write goes through here. `ADMIN_API_BASE_URL` and `ADMIN_API_SECRET`
 * are server-only: never import this from a client component.
 */

export interface AdminApiActor {
  userId: string;
  email: string;
}

/** Which admin surface is calling, kept so the audit trail still says so. */
export type AdminApiSource = "server_action" | "route_handler";

export interface AdminFetchInit extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  /**
   * The root admin behind the call. The shared secret proves the request is
   * this panel; only these headers say who pressed the button, and the API
   * writes that name into `admin_audit_logs`.
   */
  actor?: AdminApiActor;
  source?: AdminApiSource;
}

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

export async function adminFetch<T>(
  path: string,
  init: AdminFetchInit = {},
): Promise<T> {
  const { baseUrl, secret } = getEnv();
  const { params, headers, actor, source, body, ...rest } = init;

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
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      headers: {
        "content-type": "application/json",
        "x-admin-secret": secret,
        ...(actor
          ? {
              "x-admin-actor-id": actor.userId,
              "x-admin-actor-email": actor.email,
            }
          : {}),
        "x-admin-source": source ?? "route_handler",
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

  if (response.status === 204 || !text) {
    return undefined as T;
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

/** Nest JSON `{ message }` when present; otherwise the raw Error text. */
export function adminApiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message) return fallback;
  const jsonMatch = error.message.match(/failed \(\d+\):\s*(\{[\s\S]*\})$/);
  if (jsonMatch) {
    try {
      const body = JSON.parse(jsonMatch[1]) as { message?: unknown };
      if (typeof body.message === "string" && body.message.trim()) {
        return body.message;
      }
      if (Array.isArray(body.message) && body.message.length) {
        return String(body.message[0]);
      }
    } catch {
      // Keep the raw fetch error below.
    }
  }
  return error.message;
}
