import { getRootActor } from "@/lib/admin/getRootActor";
import {
  getAdminApiBaseUrl,
  getAdminApiSecretHeader,
} from "@/lib/admin/allonsPaymentsBackendRequest";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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

  const res = await fetch(`${base}/admin/refunds/summary`, {
    headers: getAdminApiSecretHeader(),
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
