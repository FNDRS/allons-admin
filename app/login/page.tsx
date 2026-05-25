"use client";

import { PasswordInput } from "@/components/ui/password-input";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-4">
          <div className="futuristic-panel w-full max-w-md p-8 text-sm text-muted">
            Cargando login...
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

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === "not-root"
      ? "Tu cuenta no tiene acceso a este panel."
      : null,
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "No se pudo iniciar sesión");
        return;
      }

      router.replace(from as never);
      router.refresh();
    } catch {
      setError("Error de red. Revisa tu conexión e intenta de nuevo.");
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
            <p className="eyebrow mt-1">Acceso solo para el equipo root</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="eyebrow block mb-1.5">Email</label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3.5 py-2.5 text-base text-white placeholder:text-white/30 transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10"
              placeholder="tucorreo@allons.app"
            />
          </div>

          <div>
            <label className="eyebrow block mb-1.5">Contraseña</label>
            <PasswordInput />
          </div>

          {error ? (
            <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full border border-white bg-white py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-60"
          >
            {submitting ? "Entrando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </main>
  );
}
