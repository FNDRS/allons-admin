import { checkRoot } from "@/lib/role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Sesión válida root-admin desde cookies (solo Server Components / Actions / Routes). */
export async function getRootActor(): Promise<{
  userId: string;
  email: string;
} | null> {
  const supabase = await createSupabaseServerClient();
  // getClaims is local decode (0ms) vs getUser network round-trip (80-300ms).
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as
    | { sub?: string; email?: string }
    | null
    | undefined;
  const userId = claims?.sub ?? null;
  const email = claims?.email ?? null;
  if (!userId || !email) return null;
  const chk = checkRoot(email);
  if (!chk.ok) return null;
  return { userId, email: chk.email };
}

/** Igual que getRootActor pero falta autorización → lanza (“No autorizado”). */
export async function requireRootActor() {
  const a = await getRootActor();
  if (!a) throw new Error("No autorizado");
  return a;
}
