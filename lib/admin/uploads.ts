/**
 * Subidas del panel: qué puede elegir el usuario en cada campo de archivo.
 *
 * Los formularios no mandan archivos por el Server Action (Next corta ese body
 * a 1 MB), así que pasan por `/api/admin/uploads`, que pide un permiso de un
 * solo uso a `allons-api` y escribe con él.
 *
 * Acá vive sólo lo que necesita el `<input type="file">`. Tipo, extensión y
 * tamaño los valida `allons-api`: es quien firma la subida, y una validación
 * que el navegador puede saltarse no es una validación.
 */

export type UploadKind = "event-image" | "provider-logo" | "comercio-contract";

type UploadPickerConfig = {
  /** Valor del atributo `accept` del input. */
  accept: string;
};

export const UPLOAD_CONFIGS: Record<UploadKind, UploadPickerConfig> = {
  "event-image": {
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif",
  },
  "provider-logo": {
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif",
  },
  "comercio-contract": {
    accept:
      "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf",
  },
};

export const EVENT_IMAGE_MAX_COUNT = 10;

const UPLOAD_KINDS = new Set(Object.keys(UPLOAD_CONFIGS));

/**
 * `in` también acepta claves heredadas, así que `kind: "constructor"` pasaba y
 * terminaba leyendo una config que no existe.
 */
export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === "string" && UPLOAD_KINDS.has(value);
}

export type UploadedFile = {
  url: string;
  path: string;
};

/**
 * Lee la lista de archivos ya subidos que manda un formulario en un input
 * oculto. Devuelve `null` si el JSON no tiene la forma esperada.
 */
export function parseUploadedFiles(
  value: unknown,
  maxCount = EVENT_IMAGE_MAX_COUNT,
): UploadedFile[] | null {
  if (!Array.isArray(value)) return null;

  const files: UploadedFile[] = [];
  for (const raw of value.slice(0, maxCount)) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const path = typeof item.path === "string" ? item.path.trim() : "";
    if (!url || !path) return null;
    files.push({ url, path });
  }

  return files;
}
