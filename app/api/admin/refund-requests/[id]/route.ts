import { getRootActor } from "@/lib/admin/getRootActor";
import {
  getAdminApiBaseUrl,
  getAdminApiSecretHeader,
} from "@/lib/admin/allonsPaymentsBackendRequest";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await getRootActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let base: string;
  try {
    base = getAdminApiBaseUrl();
  } catch {
    return NextResponse.json(
      { error: "ADMIN_API_BASE_URL is not configured" },
      { status: 500 },
    );
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const res = await fetch(
    `${base}/admin/refund-requests/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        ...getAdminApiSecretHeader(),
        "Content-Type": "application/json",
        // Quién resolvió queda en la auditoría que escribe la API.
        "x-admin-email": actor.email ?? "",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
