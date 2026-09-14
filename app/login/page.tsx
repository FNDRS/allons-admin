"use client";

import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

async function showLoginError(message: string) {
  try {
    const { toast } = await import("sonner");
    toast.error(message);
  } catch {
    console.error(message);
  }
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="futuristic-panel w-full max-w-md p-8 text-sm text-muted">
            Cargando...
          </div>
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const from = searchParams.get("from") ?? "/overview";

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hadPasswordInUrl = params.has("password");

    if (params.has("email") || hadPasswordInUrl) {
      const safeParams = new URLSearchParams();
      if (errorParam) safeParams.set("error", errorParam);
      if (from !== "/overview") safeParams.set("from", from);
      const query = safeParams.toString();
      window.history.replaceState({}, "", query ? `/login?${query}` : "/login");
    }

    if (hadPasswordInUrl) {
      void showLoginError(
        "Tu contraseña quedó expuesta en la URL. Cámbiala cuanto antes.",
      );
      return;
    }

    if (errorParam === "not-root") {
      void showLoginError("Tu cuenta no tiene acceso a este panel.");
    }
  }, [errorParam, from]);

  const handleLogin = async () => {
    if (submitting) return;

    const trimmedEmail = emailRef.current?.value.trim() ?? "";
    const password = passwordRef.current?.value ?? "";

    if (!trimmedEmail || !password) {
      void showLoginError("Falta el correo o la contraseña");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        void showLoginError(payload.error ?? "No se pudo iniciar sesión");
        return;
      }

      router.replace(from as never);
    } catch {
      void showLoginError("No hay red. Revisa la conexión e intenta otra vez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="futuristic-panel w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/apple-touch-icon.png"
            alt="Allons icon"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
            priority
          />
          <div>
            <h1 className="text-lg font-bold leading-tight">Allons Admin</h1>
            <p className="eyebrow mt-1">Solo el equipo interno</p>
          </div>
        </div>

        {/* Sin `name` ni type="submit": evita GET nativo que expone credenciales en la URL. */}
        <div
          className="space-y-4"
          role="form"
          aria-label="Iniciar sesión"
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
            event.preventDefault();
            void handleLogin();
          }}
        >
          <div>
            <Label htmlFor="login-email">Email</Label>
            <Input
              ref={emailRef}
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder="tucorreo@allons.app"
              className="h-11 text-base"
            />
          </div>

          <div>
            <Label htmlFor="login-password">Contraseña</Label>
            <PasswordInput ref={passwordRef} id="login-password" />
          </div>

          <Button
            type="button"
            disabled={submitting}
            onClick={() => void handleLogin()}
            className="w-full h-11"
          >
            {submitting ? "Entrando..." : "Iniciar sesión"}
          </Button>
        </div>
      </div>
    </main>
  );
}
