import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { getRootActor } from "@/lib/admin/getRootActor";
import {
  deleteWaitlistQrSource,
  getWaitlistQrSource,
} from "@/lib/admin/waitlistQrApi";
import { normalizeSourceSlug } from "@/lib/waitlist-qr";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    return NextResponse.json(await getWaitlistQrSource(slug));
  } catch (error) {
    console.error("[waitlist-qr] source detail error", error);
    return NextResponse.json(
      {
        error: adminApiErrorMessage(
          error,
          "No se pudo cargar el detalle de la fuente QR.",
        ),
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const actor = await getRootActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = await context.params;
  const slug = normalizeSourceSlug(params.slug);
  if (!slug) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  try {
    await deleteWaitlistQrSource(slug, actor);
  } catch (error) {
    console.error("[waitlist-qr] delete source error", error);
    return NextResponse.json(
      {
        error: adminApiErrorMessage(error, "No se pudo eliminar la fuente QR."),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
