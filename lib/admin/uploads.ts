/**
 * Subidas del panel: qué se puede subir, a qué bucket y con qué límite.
 *
 * Todo pasa por `/api/admin/uploads` en vez de por los Server Actions, porque
 * Next corta el body de un action a 1 MB y cualquier foto lo supera
 * ("Body exceeded 1 MB limit"). Un route handler no tiene ese límite y la
 * escritura sigue siendo con service role detrás del guard de root admin.
 */

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

const DOCUMENT_CONTENT_TYPES: Record<string, string> = {
  ...IMAGE_CONTENT_TYPES,
  pdf: "application/pdf",
};

export type UploadKind = "event-image" | "provider-logo" | "comercio-contract";

type UploadConfig = {
  bucket: string;
  /** Prefijo de la ruta; también es lo único que `DELETE` acepta borrar. */
  prefix: string;
  contentTypes: Record<string, string>;
  accept: string;
  maxBytes: number;
  formatsLabel: string;
};

export const UPLOAD_CONFIGS: Record<UploadKind, UploadConfig> = {
  "event-image": {
    bucket: "event-images",
    prefix: "gallery/admin_",
    contentTypes: IMAGE_CONTENT_TYPES,
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif",
    maxBytes: 10 * 1024 * 1024,
    formatsLabel: "JPG, PNG, WEBP, HEIC o HEIF",
  },
  "provider-logo": {
    bucket: "event-images",
    prefix: "provider-logos/logo_",
    contentTypes: IMAGE_CONTENT_TYPES,
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif",
    maxBytes: 5 * 1024 * 1024,
    formatsLabel: "JPG, PNG, WEBP, HEIC o HEIF",
  },
  "comercio-contract": {
    bucket: "comercio-contracts",
    prefix: "contract_",
    contentTypes: DOCUMENT_CONTENT_TYPES,
    accept: "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf",
    maxBytes: 20 * 1024 * 1024,
    formatsLabel: "PDF, JPG, PNG, WEBP, HEIC o HEIF",
  },
};

export const EVENT_IMAGE_MAX_COUNT = 10;

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === "string" && value in UPLOAD_CONFIGS;
}

export type UploadedFile = {
  url: string;
  path: string;
};

/** Extensión y content-type reales, tomando el nombre o el tipo del archivo. */
export function describeUploadFile(
  file: { name: string; type: string },
  config: UploadConfig,
) {
  const rawExtension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fromExtension = config.contentTypes[rawExtension];
  const fromFile = Object.values(config.contentTypes).includes(file.type)
    ? file.type
    : null;
  const contentType = fromExtension ?? fromFile;
  const extension = fromExtension
    ? rawExtension
    : Object.entries(config.contentTypes).find(
        ([, type]) => type === fromFile,
      )?.[0] ?? "jpg";

  if (!contentType) {
    throw new Error(
      `Formato no permitido para ${file.name}. Usa ${config.formatsLabel}.`,
    );
  }

  return { extension, contentType };
}

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
