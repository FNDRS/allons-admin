import {
  isShortGoogleMapsLink,
  parseGoogleMapsLink,
  resolveShortGoogleMapsLink,
} from "@/lib/googleMapsLink";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Expande un link corto de Google Maps y devuelve sus coordenadas.
 *
 * Vive en el servidor porque Google no manda cabeceras CORS: el navegador no
 * puede seguir el redirect por su cuenta. La ruta queda detrás del guard de
 * root admin del proxy, igual que el resto de `/api`.
 */
export async function POST(request: Request) {
  let url: string;
  try {
    const body = (await request.json()) as { url?: unknown };
    url = typeof body.url === "string" ? body.url.trim() : "";
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  if (!url) {
    return NextResponse.json({ error: "Falta el link." }, { status: 400 });
  }

  // Sólo se sale a dominios de Google Maps: sin esto el endpoint sería un
  // proxy abierto para pedir cualquier URL desde el servidor.
  if (!isShortGoogleMapsLink(url)) {
    const direct = parseGoogleMapsLink(url);
    if (direct) return NextResponse.json(direct);
    return NextResponse.json(
      { error: "El link no es de Google Maps o no tiene coordenadas." },
      { status: 422 },
    );
  }

  const coords = await resolveShortGoogleMapsLink(url);
  if (!coords) {
    return NextResponse.json(
      { error: "No pudimos leer la ubicación de ese link." },
      { status: 422 },
    );
  }

  return NextResponse.json(coords);
}
