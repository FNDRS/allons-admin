import { getRootActor } from "@/lib/admin/getRootActor";
import {
  getAdminApiBaseUrl,
  getAdminApiSecretHeader,
} from "@/lib/admin/allonsPaymentsBackendRequest";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
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

  const search = req.nextUrl.searchParams.toString();
  const url = `${base}/admin/payouts/recent${search ? `?${search}` : ""}`;

  const res = await fetch(url, {
    headers: getAdminApiSecretHeader(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
