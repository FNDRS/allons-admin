/**
 * Root admin gate. The list comes from the ROOT_ADMIN_EMAILS env var
 * (comma-separated, lowercased). The middleware reads it server-side; the
 * browser never sees the raw allowlist.
 */
function getAllowlist(): Set<string> {
  const raw = process.env.ROOT_ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isRootEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getAllowlist();
  if (allowlist.size === 0) return false;
  return allowlist.has(email.trim().toLowerCase());
}

export type RootCheckResult =
  | { ok: true; email: string }
  | { ok: false; reason: "no-session" | "not-root" };

export function checkRoot(email: string | null | undefined): RootCheckResult {
  if (!email) return { ok: false, reason: "no-session" };
  if (!isRootEmail(email)) return { ok: false, reason: "not-root" };
  return { ok: true, email: email.toLowerCase() };
}
