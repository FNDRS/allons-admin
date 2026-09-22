import { OpenLocationCode } from "open-location-code";

const olc = new OpenLocationCode();

/** Código Plus, con o sin espacios alrededor del +. */
const PLUS_CODE_RE =
  /([23456789CFGHJMPQRVWX]{2,8})\s*\+\s*([23456789CFGHJMPQRVWX]{2,7})/i;

const SETTLEMENT = new Set([
  "city",
  "town",
  "village",
  "hamlet",
  "suburb",
  "neighbourhood",
  "quarter",
  "residential",
  "locality",
  "municipality",
  "borough",
  "county",
  "state",
  "administrative",
]);

export type PlusCodeHit = {
  code: string;
  /** Texto después del código, normalmente la ciudad. */
  locality: string;
};

type NominatimHit = {
  lat?: string;
  lon?: string;
  category?: string;
  type?: string;
  addresstype?: string;
};

/**
 * Saca un Plus Code de un texto como «CXXG+GMF, Chamelecon, Cortés».
 * Los códigos cortos vienen con la ciudad porque omiten el prefijo.
 */
export function findPlusCode(raw: string): PlusCodeHit | null {
  const text = raw.trim().replace(/\uFF0B/g, "+");
  const match = PLUS_CODE_RE.exec(text);
  if (!match || match.index == null) return null;

  const code = `${match[1]}+${match[2]}`.toUpperCase();
  if (!olc.isValid(code)) return null;

  const locality = text
    .slice(match.index + match[0].length)
    .replace(/^[\s,]+/, "")
    .split(/[/?#]/)[0]
    .trim();

  return { code, locality };
}

async function referenceForLocality(
  locality: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const query = /honduras/i.test(locality) ? locality : `${locality}, Honduras`;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", query);
  url.searchParams.set("countrycodes", "hn");
  url.searchParams.set("limit", "5");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      // Nominatim rechaza pedidos sin User-Agent. En el navegador el header
      // lo pone el propio browser y no se puede sobreescribir.
      ...(typeof window === "undefined"
        ? { "User-Agent": "AllonsAdmin/1.0 (event location)" }
        : {}),
    },
  });
  if (!response.ok) return null;
  const results = (await response.json()) as NominatimHit[];
  const settlement = results.find(
    (hit) =>
      hit.category !== "waterway" &&
      (SETTLEMENT.has(hit.addresstype ?? "") || SETTLEMENT.has(hit.type ?? "")),
  );
  const hit =
    settlement ??
    results.find((item) => item.category !== "waterway") ??
    results[0];
  if (!hit) return null;
  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

/**
 * Centro del Plus Code. Los códigos cortos se completan con la ciudad que
 * viene pegada al lado; sin esa ciudad no hay un punto único.
 */
export async function resolvePlusCode(
  raw: string,
): Promise<
  | { latitude: number; longitude: number }
  | { error: string }
  | null
> {
  const found = findPlusCode(raw);
  if (!found) return null;

  let full = found.code;
  if (olc.isShort(found.code)) {
    if (!found.locality) {
      return {
        error:
          "Ese Plus Code está abreviado. Pégalo con la ciudad, por ejemplo «CXXG+GMF, Chamelecon, Cortés».",
      };
    }
    const reference = await referenceForLocality(found.locality);
    if (!reference) {
      return {
        error: "No encontramos esa ciudad para completar el Plus Code.",
      };
    }
    full = olc.recoverNearest(
      found.code,
      reference.latitude,
      reference.longitude,
    );
  }

  if (!olc.isFull(full)) {
    return { error: "Ese Plus Code no es válido." };
  }
  const area = olc.decode(full);
  return {
    latitude: area.latitudeCenter,
    longitude: area.longitudeCenter,
  };
}
