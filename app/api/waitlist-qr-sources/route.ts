import { checkRoot } from "@/lib/role";
import {
  createSupabaseServerClient,
  createSupabaseServiceRoleClient,
} from "@/lib/supabase/server";
import { normalizeOptionalText, normalizeSourceSlug } from "@/lib/waitlist-qr";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DbErrorLike = {
  code?: string;
  message?: string;
  hint?: string;
};

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

interface SourceStatRow {
  source: string;
  total: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

function describeDbError(error: DbErrorLike) {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return "Falta la tabla o vista de waitlist QR. Ejecuta el SQL de setup.";
  }
  if (error.code === "42703") {
    return "El esquema de waitlist_qr_sources está desactualizado (faltan columnas). Corre db/waitlist_qr_sources.sql.";
  }
  if (error.code === "42501") {
    return "Sin permisos para escribir en waitlist_qr_sources. Revisa service role key y RLS.";
  }
  return "Error de base de datos al procesar waitlist QR.";
}

async function requireRootSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rootCheck = checkRoot(user?.email);
  return rootCheck.ok ? { ok: true as const, email: rootCheck.email } : { ok: false as const };
}

export async function GET() {
  const root = await requireRootSession();
  if (!root.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRole = createSupabaseServiceRoleClient();

  const { data: sourcesData, error: sourcesError } = await serviceRole
    .from("waitlist_qr_sources")
    .select(
      "slug,label,location,notes,is_active,created_by,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  const isMissingSourcesTable =
    sourcesError?.code === "42P01" || sourcesError?.code === "PGRST205";
  if (sourcesError && !isMissingSourcesTable) {
    console.error("[waitlist-qr] list sources error", sourcesError);
    return NextResponse.json(
      {
        error: describeDbError(sourcesError),
        db: {
          code: sourcesError.code ?? null,
          message: sourcesError.message ?? null,
          hint: sourcesError.hint ?? null,
        },
      },
      { status: 500 },
    );
  }

  const { data: statsData, error: statsError } = await serviceRole
    .from("waitlist_by_source")
    .select("source,total,first_seen_at,last_seen_at")
    .order("total", { ascending: false });

  const isMissingStatsView =
    statsError?.code === "42P01" || statsError?.code === "PGRST205";
  if (statsError && !isMissingStatsView) {
    console.error("[waitlist-qr] list source stats error", statsError);
    return NextResponse.json(
      {
        error: describeDbError(statsError),
        db: {
          code: statsError.code ?? null,
          message: statsError.message ?? null,
          hint: statsError.hint ?? null,
        },
      },
      { status: 500 },
    );
  }

  const stats = (statsData as SourceStatRow[] | null) ?? [];
  const direct = stats.find((entry) => entry.source === "(direct)") ?? null;
  const mappedStats = stats.filter((entry) => entry.source !== "(direct)");
  const knownSlugs = new Set(((sourcesData as SourceRow[] | null) ?? []).map((row) => row.slug));
  const discovered = mappedStats
    .filter((entry) => !knownSlugs.has(entry.source))
    .map((entry) => entry.source);

  return NextResponse.json({
    setupRequired: isMissingSourcesTable || isMissingStatsView,
    setupHints: {
      sourcesTableMissing: isMissingSourcesTable,
      statsViewMissing: isMissingStatsView,
    },
    sources: (sourcesData as SourceRow[] | null) ?? [],
    stats: mappedStats,
    directCount: direct?.total ?? 0,
    discoveredSources: discovered,
  });
}

export async function POST(req: NextRequest) {
  const root = await requireRootSession();
  if (!root.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    slug?: unknown;
    label?: unknown;
    location?: unknown;
    notes?: unknown;
    isActive?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = normalizeSourceSlug(body.slug);
  if (!slug) {
    return NextResponse.json(
      {
        error:
          "Slug inválido. Usa solo letras, números, guiones o guión bajo (máx. 40).",
      },
      { status: 400 },
    );
  }

  const label = normalizeOptionalText(body.label, 80);
  if (!label) {
    return NextResponse.json(
      { error: "La etiqueta es obligatoria." },
      { status: 400 },
    );
  }

  const location = normalizeOptionalText(body.location, 120);
  const notes = normalizeOptionalText(body.notes, 240);
  const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

  const serviceRole = createSupabaseServiceRoleClient();
  const payload = {
    slug,
    label,
    location,
    notes,
    is_active: isActive,
    created_by: root.email,
  };

  const { data, error } = await serviceRole
    .from("waitlist_qr_sources")
    .upsert(payload, { onConflict: "slug" })
    .select(
      "slug,label,location,notes,is_active,created_by,created_at,updated_at",
    )
    .single();

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      return NextResponse.json(
        {
          error:
            "Falta la tabla waitlist_qr_sources. Corre el SQL de setup en Supabase.",
          setupRequired: true,
        },
        { status: 500 },
      );
    }
    console.error("[waitlist-qr] upsert source error", error);
    return NextResponse.json(
      {
        error: describeDbError(error),
        db: {
          code: error.code ?? null,
          message: error.message ?? null,
          hint: error.hint ?? null,
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ source: data });
}
