/** Primer carácter más hasta 39: 40 en total, como dice el mensaje de error. */
export const WAITLIST_SOURCE_RE = /^[a-z0-9][a-z0-9-_]{0,39}$/i;

export function normalizeSourceSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return WAITLIST_SOURCE_RE.test(normalized) ? normalized : null;
}

export function normalizeOptionalText(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}
