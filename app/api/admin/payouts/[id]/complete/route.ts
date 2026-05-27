import { getRootActor } from "@/lib/admin/getRootActor";
import {
  getAdminApiBaseUrl,
  getAdminApiSecretHeader,
} from "@/lib/admin/allonsPaymentsBackendRequest";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await getRootActor())) {
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

  const { id } = await ctx.params;

  const res = await fetch(
    `${base}/admin/payouts/${encodeURIComponent(id)}/complete`,
    {
      method: "POST",
      headers: {
        ...getAdminApiSecretHeader(),
        "Content-Type": "application/json",
      },
      body: "{}",
      cache: "no-store",
    },
  );

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
