import "server-only";

/** Server-only: base URL of allons-api for admin payment routes (no trailing slash). */
export function getAdminApiBaseUrl(): string {
  const base = process.env.ADMIN_API_BASE_URL?.replace(/\/+$/, "") ?? "";
  if (!base) {
    throw new Error("ADMIN_API_BASE_URL is not configured");
  }
  return base;
}

export function getAdminApiSecretHeader(): Record<string, string> {
  return {
    "x-admin-secret": process.env.ADMIN_API_SECRET ?? "",
  };
}
