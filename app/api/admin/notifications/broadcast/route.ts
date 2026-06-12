import { getRootActor } from "@/lib/admin/getRootActor";
import {
  getAdminApiBaseUrl,
  getAdminApiSecretHeader,
} from "@/lib/admin/allonsPaymentsBackendRequest";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // getRootActor() returns null (does not throw) for unauthenticated/non-root
  // callers — the result MUST be checked. This endpoint forwards to the backend
  // using the trusted ADMIN_API_SECRET to broadcast to all clients/providers,
  // so an unguarded path is a platform-wide push-broadcast vector.
  if (!(await getRootActor())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const base = getAdminApiBaseUrl();
  const body = await req.json().catch(() => null);

  const res = await fetch(`${base}/admin/notifications/broadcast`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...getAdminApiSecretHeader(),
    },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });

  const text = await res.text().catch(() => "");
  return new Response(text || "", {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "text/plain" },
  });
}
