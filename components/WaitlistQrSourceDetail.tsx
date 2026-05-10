"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SourceRow {
  slug: string;
  label: string;
  location: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface WaitlistPersonRow {
  email: string;
  created_at: string;
  referer: string | null;
  ip: string | null;
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function WaitlistQrSourceDetail({ slug }: { slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<SourceRow | null>(null);
  const [people, setPeople] = useState<WaitlistPersonRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/waitlist-qr-sources/${slug}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          source?: SourceRow | null;
          people?: WaitlistPersonRow[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? "No se pudo cargar el detalle del QR.");
        }
        setSource(data.source ?? null);
        setPeople(data.people ?? []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el detalle del QR.",
        );
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [slug]);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Detalle QR {source?.label ?? slug}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Fuente: <span className="text-white">{slug}</span>
            {source?.location ? (
              <>
                {" "}
                · Ubicación: <span className="text-white">{source.location}</span>
              </>
            ) : null}
          </p>
        </div>
        <Link
          href="/waitlist-qr"
          className="border border-white/20 px-3 py-2 text-xs text-muted hover:text-white"
        >
          Volver a listado
        </Link>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={deleting}
          onClick={() => setConfirmOpen(true)}
          className="border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/20 disabled:opacity-60"
        >
          {deleting ? "Eliminando..." : "Eliminar QR"}
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar QR</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a eliminar la fuente <span className="text-white">{slug}</span>.
              Los registros históricos de personas no se eliminarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border border-white/20 px-3 py-2 text-xs text-muted hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-medium text-danger hover:bg-danger/20"
              onClick={async (event) => {
                event.preventDefault();
                setDeleting(true);
                try {
                  const res = await fetch(`/api/waitlist-qr-sources/${slug}`, {
                    method: "DELETE",
                  });
                  const data = (await res.json().catch(() => ({}))) as {
                    error?: string;
                  };
                  if (!res.ok) {
                    throw new Error(
                      data.error ?? "No se pudo eliminar la fuente QR.",
                    );
                  }
                  setConfirmOpen(false);
                  router.push("/waitlist-qr");
                  router.refresh();
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : "No se pudo eliminar la fuente QR.",
                  );
                } finally {
                  setDeleting(false);
                }
              }}
            >
              Sí, eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="futuristic-panel p-5">
        <h2 className="text-base font-semibold">Personas registradas</h2>

        {loading ? (
          <p className="mt-3 text-sm text-muted">Cargando personas...</p>
        ) : error ? (
          <p className="mt-3 text-sm text-danger">{error}</p>
        ) : people.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            No hay personas registradas aún para este QR.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto border border-white/15">
            <table className="w-full text-left text-sm">
              <thead className="bg-surfaceMuted/40 text-xs text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Referer</th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr
                    key={`${person.email}-${person.created_at}`}
                    className="border-t border-white/10"
                  >
                    <td className="px-3 py-2">{person.email}</td>
                    <td className="px-3 py-2">{formatDate(person.created_at)}</td>
                    <td className="px-3 py-2 text-muted">{person.referer ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
