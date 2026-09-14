/**
 * Coordenadas a partir de un link de Google Maps (o de un par pegado a mano).
 *
 * Este archivo está duplicado tal cual en allons-mobile (`lib/googleMapsLink.ts`)
 * para que el pin del panel y el de la app entiendan exactamente los mismos
 * links. Si cambiás un patrón acá, cambialo allá.
 */

export type MapCoordinates = { latitude: number; longitude: number };

function isValidCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180 &&
    // (0,0) es lo que devuelve un link sin coordenadas reales; nunca es un lugar.
    !(latitude === 0 && longitude === 0)
  );
}

/**
 * En orden de precisión: `!3d!4d` es el pin exacto del lugar, `q=`/`ll=` lo que
 * pidió el usuario, y `@` solamente el centro del encuadre del mapa.
 */
const COORDINATE_PATTERNS = [
  /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  /[?&](?:q|query|daddr|saddr|destination|center|ll|sll|mlat)=(?:loc:)?(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
  /geo:(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
  /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
  /(?:^|[\s(])(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:[\s)]|$)/,
];

/** Los links de "Compartir" de la app son cortos y hay que seguir el redirect. */
const SHORT_LINK_HOSTS = [
  "maps.app.goo.gl",
  "goo.gl",
  "g.co",
  "maps.google.com/url",
];

export function isShortGoogleMapsLink(raw: string) {
  const value = raw.trim().toLowerCase();
  if (!/^https?:\/\//.test(value)) return false;
  return SHORT_LINK_HOSTS.some((host) => value.includes(host));
}

/**
 * Devuelve las coordenadas de un link ya expandido, de un `geo:` o de un par
 * "lat, lng" escrito a mano. Para un link corto devuelve null: hay que
 * resolverlo antes (`resolveShortGoogleMapsLink`).
 */
export function parseGoogleMapsLink(raw: string): MapCoordinates | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Un link trae las coordenadas escapadas cuando el nombre del lugar tiene
  // acentos; se prueba crudo y decodificado porque decodeURIComponent puede
  // reventar con un `%` suelto.
  const candidates = [trimmed];
  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded !== trimmed) candidates.push(decoded);
  } catch {
    // Link con escapes inválidos: alcanza con el crudo.
  }

  for (const pattern of COORDINATE_PATTERNS) {
    for (const candidate of candidates) {
      const match = candidate.match(pattern);
      if (!match) continue;
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (isValidCoordinate(latitude, longitude)) {
        return { latitude, longitude };
      }
    }
  }

  return null;
}

/**
 * Sigue el redirect de un link corto y saca las coordenadas del destino.
 *
 * `fetchImpl` existe para el navegador, donde el pedido tiene que pasar por el
 * backend propio: Google no manda CORS y un fetch directo falla.
 */
export async function resolveShortGoogleMapsLink(
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MapCoordinates | null> {
  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      headers: {
        // Sin un user agent de navegador, Google responde una página sin
        // coordenadas para el link corto.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    });

    const fromUrl = parseGoogleMapsLink(response.url);
    if (fromUrl) return fromUrl;

    // Algunos links cortos aterrizan en una página de consentimiento y las
    // coordenadas sólo están en el HTML.
    const body = await response.text();
    return parseGoogleMapsLink(body);
  } catch {
    return null;
  }
}
