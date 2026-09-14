import {
  describeUploadFile,
  isUploadKind,
  UPLOAD_CONFIGS,
  type UploadedFile,
} from "@/lib/admin/uploads";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Sube un archivo del panel (imagen de evento, logo de comercio o contrato).
 *
 * Los formularios no pueden mandar archivos por el Server Action: Next corta
 * ese body a 1 MB. Acá no hay ese límite, y el bucket nunca queda expuesto al
 * navegador porque la escritura la hace el service role.
 */
export async function POST(request: Request) {
  let file: File | null = null;
  let kind: unknown;
  try {
    const formData = await request.formData();
    const value = formData.get("file");
    file = value instanceof File ? value : null;
    kind = formData.get("kind");
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!isUploadKind(kind)) {
    return NextResponse.json({ error: "Tipo de subida inválido." }, { status: 422 });
  }
  const config = UPLOAD_CONFIGS[kind];

  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }
  if (file.size > config.maxBytes) {
    const mb = Math.round(config.maxBytes / (1024 * 1024));
    return NextResponse.json(
      { error: `${file.name} supera el límite de ${mb} MB.` },
      { status: 413 },
    );
  }

  let extension: string;
  let contentType: string;
  try {
    ({ extension, contentType } = describeUploadFile(file, config));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Formato no permitido." },
      { status: 415 },
    );
  }

  const admin = createSupabaseServiceRoleClient();
  const filename = `${config.prefix}${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

  const { data, error } = await admin.storage
    .from(config.bucket)
    .upload(filename, await file.arrayBuffer(), { contentType, upsert: false });

  if (error || !data) {
    return NextResponse.json(
      { error: `Error subiendo ${file.name}: ${error?.message ?? "desconocido"}` },
      { status: 502 },
    );
  }

  const uploaded: UploadedFile = {
    path: data.path,
    url: admin.storage.from(config.bucket).getPublicUrl(data.path).data.publicUrl,
  };
  return NextResponse.json(uploaded);
}

/** Borra un archivo que se quitó del formulario antes de guardarlo. */
export async function DELETE(request: Request) {
  let path = "";
  let kind: unknown;
  try {
    const body = (await request.json()) as { path?: unknown; kind?: unknown };
    path = typeof body.path === "string" ? body.path.trim() : "";
    kind = body.kind;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!isUploadKind(kind)) {
    return NextResponse.json({ error: "Tipo de subida inválido." }, { status: 422 });
  }
  const config = UPLOAD_CONFIGS[kind];

  // Sólo lo que sube este panel: sin esto se podría borrar cualquier objeto
  // del bucket pasando una ruta arbitraria.
  if (!path.startsWith(config.prefix)) {
    return NextResponse.json({ error: "Ruta no permitida." }, { status: 422 });
  }

  const admin = createSupabaseServiceRoleClient();
  const { error } = await admin.storage.from(config.bucket).remove([path]);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
