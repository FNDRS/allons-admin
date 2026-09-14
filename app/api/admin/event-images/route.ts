import {
  describeImageFile,
  EVENT_IMAGE_MAX_BYTES,
  type UploadedEventImage,
} from "@/lib/admin/eventImages";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Sube una imagen de evento al bucket `event-images`.
 *
 * Existe porque el formulario no puede mandar los archivos por el Server
 * Action: Next corta el body a 1 MB y una galería lo pasa enseguida. Un route
 * handler no tiene ese límite, y la subida sigue ocurriendo con service role
 * detrás del guard de root admin del proxy, sin abrir el bucket al navegador.
 */
export async function POST(request: Request) {
  let file: File | null = null;
  try {
    const formData = await request.formData();
    const value = formData.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (file.size > EVENT_IMAGE_MAX_BYTES) {
    return NextResponse.json(
      { error: `${file.name} supera el límite de 10 MB.` },
      { status: 413 },
    );
  }

  let extension: string;
  let contentType: string;
  try {
    ({ extension, contentType } = describeImageFile(file));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Formato no permitido." },
      { status: 415 },
    );
  }

  const admin = createSupabaseServiceRoleClient();
  const filename = `gallery/admin_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

  const { data, error } = await admin.storage
    .from("event-images")
    .upload(filename, await file.arrayBuffer(), { contentType, upsert: false });

  if (error || !data) {
    return NextResponse.json(
      { error: `Error subiendo ${file.name}: ${error?.message ?? "desconocido"}` },
      { status: 502 },
    );
  }

  const uploaded: UploadedEventImage = {
    path: data.path,
    url: admin.storage.from("event-images").getPublicUrl(data.path).data
      .publicUrl,
  };
  return NextResponse.json(uploaded);
}

/** Borra una imagen que el usuario quitó antes de guardar el evento. */
export async function DELETE(request: Request) {
  let path = "";
  try {
    const body = (await request.json()) as { path?: unknown };
    path = typeof body.path === "string" ? body.path.trim() : "";
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  // Sólo lo que sube este panel: sin esto se podría borrar cualquier objeto.
  if (!path.startsWith("gallery/admin_")) {
    return NextResponse.json({ error: "Ruta no permitida." }, { status: 422 });
  }

  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin.storage.from("event-images").remove([path]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
