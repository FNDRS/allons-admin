import { isRootEmail } from "@/lib/role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const email = body.email?.trim() ?? "";
  const password = body.password ?? "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son requeridos" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isRootEmail(user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: "Tu cuenta no tiene acceso a este panel." },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}
