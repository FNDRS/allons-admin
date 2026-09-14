/**
 * Formatos y límites de las imágenes de evento, compartidos entre el route
 * handler que las sube y el campo del formulario que las elige.
 */

export const EVENT_IMAGE_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

export const EVENT_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const EVENT_IMAGE_MAX_COUNT = 10;
export const EVENT_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif";

export type UploadedEventImage = {
  url: string;
  path: string;
};

/** Extensión y content-type reales, tomando el nombre o el tipo del archivo. */
export function describeImageFile(file: { name: string; type: string }) {
  const rawExtension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const contentTypeFromExtension = EVENT_IMAGE_CONTENT_TYPES[rawExtension];
  const contentTypeFromFile = Object.values(EVENT_IMAGE_CONTENT_TYPES).includes(
    file.type,
  )
    ? file.type
    : null;
  const contentType = contentTypeFromExtension ?? contentTypeFromFile;
  const extension = contentTypeFromExtension
    ? rawExtension
    : Object.entries(EVENT_IMAGE_CONTENT_TYPES).find(
        ([, type]) => type === contentTypeFromFile,
      )?.[0] ?? "jpg";

  if (!contentType) {
    throw new Error(
      `Formato no permitido para ${file.name}. Usa JPG, PNG, WEBP, HEIC o HEIF.`,
    );
  }

  return { extension, contentType };
}

/**
 * Lee lo que el formulario manda en el input oculto `eventImages`: la lista de
 * imágenes ya subidas. Devuelve `null` si el JSON no tiene la forma esperada.
 */
export function parseUploadedEventImages(
  value: unknown,
): UploadedEventImage[] | null {
  if (!Array.isArray(value)) return null;

  const images: UploadedEventImage[] = [];
  for (const raw of value.slice(0, EVENT_IMAGE_MAX_COUNT)) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const url = typeof item.url === "string" ? item.url.trim() : "";
    const path = typeof item.path === "string" ? item.path.trim() : "";
    if (!url || !path) return null;
    images.push({ url, path });
  }

  return images;
}
