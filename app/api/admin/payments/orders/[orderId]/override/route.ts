import { getRootActor } from "@/lib/admin/getRootActor";
import {
  getAdminApiBaseUrl,
  getAdminApiSecretHeader,
} from "@/lib/admin/allonsPaymentsBackendRequest";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ orderId: string }> },
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

  const { orderId } = await ctx.params;
  const body = await req.text();

  const res = await fetch(
    `${base}/admin/payments/orders/${encodeURIComponent(orderId)}/override`,
    {
      method: "POST",
      headers: {
        ...getAdminApiSecretHeader(),
        "Content-Type": "application/json",
      },
      body,
      cache: "no-store",
    },
  );

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
