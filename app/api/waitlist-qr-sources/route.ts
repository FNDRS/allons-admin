import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { getRootActor } from "@/lib/admin/getRootActor";
import {
  getWaitlistQrOverview,
  upsertWaitlistQrSource,
} from "@/lib/admin/waitlistQrApi";
import { normalizeOptionalText, normalizeSourceSlug } from "@/lib/waitlist-qr";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy de mismo origen para la pantalla de QRs.
 *
 * El componente corre en el navegador y `ADMIN_API_BASE_URL` / `ADMIN_API_SECRET`
 * son server-only, así que la llamada a `allons-api` pasa por acá. La auditoría
 * la escribe la API dentro de la misma petición.
 */
export async function GET() {
  if (!(await getRootActor())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getWaitlistQrOverview());
  } catch (error) {
    console.error("[waitlist-qr] list sources error", error);
    return NextResponse.json(
      {
        error: adminApiErrorMessage(
          error,
          "No se pudieron cargar las fuentes QR.",
        ),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const actor = await getRootActor();
  if (!actor) {
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

  try {
    const { source } = await upsertWaitlistQrSource(
      slug,
      {
        label,
        location: normalizeOptionalText(body.location, 120),
        notes: normalizeOptionalText(body.notes, 240),
        isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      },
      actor,
    );
    return NextResponse.json({ source });
  } catch (error) {
    console.error("[waitlist-qr] upsert source error", error);
    return NextResponse.json(
      {
        error: adminApiErrorMessage(error, "No se pudo guardar la fuente QR."),
      },
      { status: 500 },
    );
  }
}
