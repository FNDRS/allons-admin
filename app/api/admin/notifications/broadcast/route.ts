import { getRootActor } from "@/lib/admin/getRootActor";
import {
  getAdminApiBaseUrl,
  getAdminApiSecretHeader,
} from "@/lib/admin/allonsPaymentsBackendRequest";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  await getRootActor();

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
