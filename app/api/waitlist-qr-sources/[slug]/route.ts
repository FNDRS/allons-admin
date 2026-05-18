import {
  logAdminAudit,
  peekClientProbeFromHeaders,
} from "@/lib/admin/auditLog";
import { getRootActor } from "@/lib/admin/getRootActor";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { normalizeSourceSlug } from "@/lib/waitlist-qr";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WaitlistPersonRow {
  email: string;
  created_at: string;
  referer: string | null;
  ip: string | null;
}

interface SourceRow {
  slug: string;
  label: string;
  location: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  if (!(await getRootActor())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const slug = normalizeSourceSlug(params.slug);
  if (!slug) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  const serviceRole = createSupabaseServiceRoleClient();

  const { data: source, error: sourceError } = await serviceRole
    .from("waitlist_qr_sources")
    .select(
      "slug,label,location,notes,is_active,created_by,created_at,updated_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (sourceError) {
    console.error("[waitlist-qr] source detail error", sourceError);
    return NextResponse.json(
      { error: "No se pudo cargar el detalle de la fuente QR." },
      { status: 500 },
    );
  }

  const { data: people, error: peopleError } = await serviceRole
    .from("waitlist")
    .select("email,created_at,referer,ip")
    .eq("source", slug)
    .order("created_at", { ascending: false })
    .limit(200);

  if (peopleError) {
    console.error("[waitlist-qr] source people error", peopleError);
    return NextResponse.json(
      { error: "No se pudo cargar la lista de personas de este QR." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    source: (source as SourceRow | null) ?? null,
    people: (people as WaitlistPersonRow[] | null) ?? [],
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const actor = await getRootActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const probes = peekClientProbeFromHeaders(req.headers);

  const params = await context.params;
  const slug = normalizeSourceSlug(params.slug);
  if (!slug) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  const httpPath = `/api/waitlist-qr-sources/${encodeURIComponent(slug)}`;

  const serviceRole = createSupabaseServiceRoleClient();
  const { error } = await serviceRole
    .from("waitlist_qr_sources")
    .delete()
    .eq("slug", slug);

  if (error) {
    console.error("[waitlist-qr] delete source error", error);
    await logAdminAudit({
      actor_user_id: actor.userId,
      actor_email: actor.email,
      source: "route_handler",
      action: "waitlist_qr.source_delete",
      resource_type: "waitlist_qr_source",
      resource_id: slug,
      outcome: "failure",
      http_method: req.method,
      http_path: httpPath,
      ip_address: probes.ip_address ?? null,
      user_agent: probes.user_agent ?? null,
      client_request_id: probes.client_request_id ?? null,
      error_code: error.code ?? null,
      error_message: error.message ?? null,
      state_before: { slug },
    });
    return NextResponse.json(
      { error: "No se pudo eliminar la fuente QR." },
      { status: 500 },
    );
  }

  await logAdminAudit({
    actor_user_id: actor.userId,
    actor_email: actor.email,
    source: "route_handler",
    action: "waitlist_qr.source_delete",
    resource_type: "waitlist_qr_source",
    resource_id: slug,
    outcome: "success",
    http_method: req.method,
    http_path: httpPath,
    ip_address: probes.ip_address ?? null,
    user_agent: probes.user_agent ?? null,
    client_request_id: probes.client_request_id ?? null,
    state_before: { slug },
  });

  return NextResponse.json({ ok: true });
}
