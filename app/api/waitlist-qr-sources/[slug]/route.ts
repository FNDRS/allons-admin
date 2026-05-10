import { checkRoot } from "@/lib/role";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
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

async function requireRootSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rootCheck = checkRoot(user?.email);
  return rootCheck.ok ? { ok: true as const } : { ok: false as const };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const root = await requireRootSession();
  if (!root.ok) {
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
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const root = await requireRootSession();
  if (!root.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const slug = normalizeSourceSlug(params.slug);
  if (!slug) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  const serviceRole = createSupabaseServiceRoleClient();
  const { error } = await serviceRole
    .from("waitlist_qr_sources")
    .delete()
    .eq("slug", slug);

  if (error) {
    console.error("[waitlist-qr] delete source error", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la fuente QR." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
