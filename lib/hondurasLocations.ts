export const HONDURAS_BOUNDS = {
  minLatitude: 12.9,
  maxLatitude: 16.55,
  minLongitude: -89.4,
  maxLongitude: -83.1,
} as const;

const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  Tegucigalpa: { latitude: 14.0723, longitude: -87.1921 },
  "San Pedro Sula": { latitude: 15.5042, longitude: -88.025 },
  "La Ceiba": { latitude: 15.7597, longitude: -86.7822 },
  Comayagua: { latitude: 14.452, longitude: -87.638 },
  Choloma: { latitude: 15.6144, longitude: -87.953 },
  "Puerto Cortes": { latitude: 15.8256, longitude: -87.9297 },
  "Santa Rosa de Copan": { latitude: 14.776, longitude: -88.776 },
  Choluteca: { latitude: 13.3, longitude: -87.183 },
  Roatan: { latitude: 16.323, longitude: -86.53 },
  "El Progreso": { latitude: 15.4, longitude: -87.8 },
};

const HONDURAS_CITY_OPTIONS = [
  "La Ceiba",
  "Tela",
  "Jutiapa",
  "Arizona",
  "Esparta",
  "Choluteca",
  "San Lorenzo",
  "Pespire",
  "Marcovia",
  "Namasigue",
  "Trujillo",
  "Tocoa",
  "Bonito Oriental",
  "Balfate",
  "Iriona",
  "Comayagua",
  "Siguatepeque",
  "Taulabe",
  "Lejamani",
  "La Libertad",
  "Santa Rosa de Copan",
  "Copan Ruinas",
  "Nueva Arcadia",
  "La Jigua",
  "Cucuyagua",
  "San Pedro Sula",
  "Puerto Cortes",
  "Choloma",
  "Villanueva",
  "La Lima",
  "Yuscaran",
  "Danli",
  "Trojes",
  "Teupasenti",
  "Jacaleapa",
  "Tegucigalpa",
  "Comayaguela",
  "Valle de Angeles",
  "Santa Lucia",
  "Talanga",
  "Puerto Lempira",
  "Brus Laguna",
  "Ahuas",
  "Juan Francisco Bulnes",
  "Villeda Morales",
  "La Esperanza",
  "Intibuca",
  "Jesus de Otoro",
  "Yamaranguila",
  "San Miguelito",
  "Roatan",
  "Guanaja",
  "Utila",
  "Jose Santos Guardiola",
  "La Paz",
  "Marcala",
  "San Jose",
  "Santiago de Puringla",
  "Cane",
  "Gracias",
  "Erandique",
  "La Campa",
  "San Manuel Colohete",
  "Gualcinse",
  "Nueva Ocotepeque",
  "Sinuapa",
  "La Labor",
  "Belen Gualcho",
  "Mercedes",
  "Juticalpa",
  "Catacamas",
  "Campamento",
  "San Esteban",
  "Patuca",
  "Santa Barbara",
  "Quimistan",
  "Trinidad",
  "Ilama",
  "San Luis",
  "Nacaome",
  "Amapala",
  "Aramecina",
  "Alianza",
  "Yoro",
  "Olanchito",
  "Morazan",
  "Victoria",
] as const;

const CITY_ALIASES: Record<string, string> = {
  "distrito central": "Tegucigalpa",
  "municipio del distrito central": "Tegucigalpa",
  "tegucigalpa mdc": "Tegucigalpa",
  "puerto cortes": "Puerto Cortes",
  "santa rosa de copan": "Santa Rosa de Copan",
};

function normalizeCityName(city: string) {
  return city
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function distanceKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const sin =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(sin)));
}

function isNameBoundary(char: string | undefined) {
  return !char || /[^a-z0-9]/.test(char);
}

function textContainsCity(haystack: string, city: string) {
  const needle = normalizeCityName(city);
  if (!needle) return false;
  const idx = haystack.indexOf(needle);
  if (idx < 0) return false;
  return (
    isNameBoundary(haystack[idx - 1]) &&
    isNameBoundary(haystack[idx + needle.length])
  );
}

export function isInsideHonduras(latitude: number, longitude: number) {
  return (
    latitude >= HONDURAS_BOUNDS.minLatitude &&
    latitude <= HONDURAS_BOUNDS.maxLatitude &&
    longitude >= HONDURAS_BOUNDS.minLongitude &&
    longitude <= HONDURAS_BOUNDS.maxLongitude
  );
}

export function findKnownCity(city: string): string | null {
  const normalized = normalizeCityName(city);
  if (!normalized) return null;
  const aliased = CITY_ALIASES[normalized];
  if (aliased) return aliased;
  return (
    HONDURAS_CITY_OPTIONS.find(
      (option) => normalizeCityName(option) === normalized,
    ) ?? null
  );
}

export function findKnownCityInText(text: string): string | null {
  const normalized = normalizeCityName(text);
  if (!normalized) return null;
  for (const [alias, city] of Object.entries(CITY_ALIASES)) {
    if (textContainsCity(normalized, alias)) return city;
  }
  for (const city of [...HONDURAS_CITY_OPTIONS].sort((a, b) => b.length - a.length)) {
    if (textContainsCity(normalized, city)) return city;
  }
  return null;
}

export function nearestKnownCity(
  latitude: number,
  longitude: number,
  maxKm = 35,
): string | null {
  let best: { city: string; km: number } | null = null;
  for (const [name, coords] of Object.entries(CITY_COORDINATES)) {
    const km = distanceKm({ latitude, longitude }, coords);
    if (km > maxKm) continue;
    if (best && km >= best.km) continue;
    const city = findKnownCity(name);
    if (!city) continue;
    best = { city, km };
  }
  return best?.city ?? null;
}

export function resolveKnownCity(input: {
  parts?: Array<string | null | undefined>;
  latitude?: number | null;
  longitude?: number | null;
}): string | null {
  for (const part of input.parts ?? []) {
    const exact = part ? findKnownCity(part) : null;
    if (exact) return exact;
  }
  const blob = (input.parts ?? []).filter(Boolean).join(", ");
  const fromText = findKnownCityInText(blob);
  if (fromText) return fromText;
  if (input.latitude == null || input.longitude == null) return null;
  return nearestKnownCity(input.latitude, input.longitude);
}

export function parseMapCoordinates(raw: string): {
  latitude: number;
  longitude: number;
} | null {
  const input = decodeURIComponent(raw.trim());
  if (!input) return null;

  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /(?:^|\s)(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)(?:\s|$)/,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (!match) continue;
    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { latitude, longitude };
    }
  }

  return null;
}
