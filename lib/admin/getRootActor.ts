import { checkRoot } from "@/lib/role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Sesión válida root-admin desde cookies (solo Server Components / Actions / Routes). */
export async function getRootActor(): Promise<{
  userId: string;
  email: string;
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id || !user.email) return null;
  const chk = checkRoot(user.email);
  if (!chk.ok) return null;
  return { userId: user.id, email: chk.email };
}

/** Igual que getRootActor pero falta autorización → lanza (“No autorizado”). */
export async function requireRootActor() {
  const a = await getRootActor();
  if (!a) throw new Error("No autorizado");
  return a;
}
