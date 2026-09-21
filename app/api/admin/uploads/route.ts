import { adminApiErrorMessage } from "@/lib/admin/adminFetch";
import { getRootActor } from "@/lib/admin/getRootActor";
import { createUploadTicket, deleteUpload } from "@/lib/admin/uploadsApi";
import { isUploadKind, type UploadedFile } from "@/lib/admin/uploads";
import { createSupabaseAnonClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Sube un archivo del panel (imagen de evento, logo de comercio o contrato).
 *
 * Los formularios no pueden mandar archivos por el Server Action: Next corta
 * ese body a 1 MB. Acá no hay ese límite.
 *
 * El panel ya no tiene service role, así que la escritura va con un permiso de
 * un solo uso: `allons-api` valida tipo y tamaño, devuelve una URL firmada
 * para exactamente un objeto, y estos bytes se escriben contra ella. El bucket
 * nunca queda expuesto al navegador y esta app nunca ve una llave.
 */
export async function POST(request: Request) {
  if (!(await getRootActor())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  let ticket;
  try {
    ticket = await createUploadTicket({
      kind,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    });
  } catch (error) {
    return NextResponse.json(
      { error: adminApiErrorMessage(error, "No se pudo preparar la subida.") },
      { status: 422 },
    );
  }

  // Con el SDK y no con un PUT a mano: es él quien sabe qué cabeceras espera
  // el endpoint de Storage detrás del gateway, y equivocarse ahí sólo se nota
  // en producción.
  const { error: uploadError } = await createSupabaseAnonClient()
    .storage.from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, await file.arrayBuffer(), {
      contentType: ticket.contentType,
      // Cada ticket nombra una ruta nueva, así que sobrescribir sólo podría
      // pasar por accidente.
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Error subiendo ${file.name}: ${uploadError.message}` },
      { status: 502 },
    );
  }

  const uploaded: UploadedFile = { path: ticket.path, url: ticket.publicUrl };
  return NextResponse.json(uploaded);
}

/** Borra un archivo que se quitó del formulario antes de guardarlo. */
export async function DELETE(request: Request) {
  if (!(await getRootActor())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  try {
    await deleteUpload(kind, path);
  } catch (error) {
    return NextResponse.json(
      { error: adminApiErrorMessage(error, "No se pudo borrar el archivo.") },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
