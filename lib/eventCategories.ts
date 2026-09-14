/**
 * Categorías del evento, iguales a las de la app mobile
 * (`constants/interests.ts` + `hooks/event-form/constants.ts`).
 *
 * En la base de datos una categoría es una fila de `interests` enlazada al
 * evento por `event_interests`; el admin replica lo que hace la API en
 * `allons-api/src/features/providers/event-category.ts`.
 */

export const INTEREST_OPTIONS = [
  "Cine y proyecciones",
  "Festivales culturales",
  "Exhibiciones de Arte",
  "Música",
  "Ciencia y tecnología",
  "Comic-Cons",
  "Conciertos",
  "Fitness y entrenamiento",
  "Partidos y torneos",
  "Conferencias",
  "Hackathons",
  "Catas de vino o cerveza",
  "Festivales gastronómicos",
  "Raves",
  "Gaming y e-sports",
  "Ferias y convenciones",
  "Comidas",
  "Bares & drinks",
  "Teatro y artes escénicas",
  "Bienestar y wellness",
  "Clases y talleres",
  "Fiestas y nightlife",
] as const;

/** Chip que sólo existe en el formulario: abre el campo de categoría libre. */
export const EVENT_OTHER_CATEGORY = "Otro";

export const EVENT_CATEGORIES: string[] = [
  ...INTEREST_OPTIONS,
  EVENT_OTHER_CATEGORY,
];

export function isCatalogEventCategory(name: string) {
  return (INTEREST_OPTIONS as readonly string[]).includes(name);
}

/** Mismo slug que usa la API para no duplicar filas en `interests`. */
export function toInterestSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " y ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
