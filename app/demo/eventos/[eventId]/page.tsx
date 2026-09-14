import { getAdminEvent } from "@/lib/admin/eventsApi";
import { getDemoEventForm } from "@/lib/demoEventForms";
import { CheckCircle2, MapPin } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function formatDateTime(iso: string | null) {
  if (!iso) return "Fecha por confirmar";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return date.toLocaleString("es-HN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function DemoEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ registered?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;

  let event: Awaited<ReturnType<typeof getAdminEvent>> | null = null;
  try {
    event = await getAdminEvent(eventId);
  } catch {
    notFound();
  }

  const form = await getDemoEventForm(eventId);
  const color = event.themeColor ?? "#F67010";

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow">Allons demo web</div>
            <div className="mt-1 text-sm text-white/55">
              Registro personalizado para eventos únicos
            </div>
          </div>
          <Link
            href={`/demo/eventos/${eventId}/registro` as never}
            className="hidden border border-white bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90 sm:inline-block"
          >
            Registrarme
          </Link>
        </div>

        {query.registered ? (
          <div className="mb-6 flex items-center gap-3 border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            <CheckCircle2 size={18} /> Registro recibido. Tus respuestas quedaron guardadas para la demo.
          </div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="futuristic-panel overflow-hidden">
            <div
              className="h-64 border-b border-white/10 bg-cover bg-center"
              style={{
                backgroundColor: color,
                backgroundImage: event.coverImageUrl
                  ? `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.65)), url(${event.coverImageUrl})`
                  : `radial-gradient(circle at 20% 10%, ${color}, #050505 62%)`,
              }}
            />
            <div className="p-6 sm:p-8">
              <div className="mb-3 inline-flex border border-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/65">
                Evento único
              </div>
              <h1 className="max-w-3xl text-4xl leading-tight sm:text-5xl">
                {event.title}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/68 whitespace-pre-wrap">
                {event.description || "Completa tu registro para reservar tu espacio en este evento."}
              </p>
            </div>
          </div>

          <aside className="futuristic-panel p-6 sm:p-7">
            <div className="eyebrow">Detalle</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-white/45">
                  Fecha
                </div>
                <div className="mt-1 text-lg font-semibold capitalize">
                  {formatDateTime(event.startsAt)}
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-white/45">
                  Ubicación
                </div>
                <div className="mt-1 flex items-start gap-2 text-sm text-white/75">
                  <MapPin size={16} className="mt-0.5 shrink-0" />
                  <span>
                    {[event.venue, event.city].filter(Boolean).join(" · ") || "Por confirmar"}
                  </span>
                </div>
              </div>
              <div className="border-t border-white/10 pt-4">
                <div className="text-xs font-bold uppercase tracking-wide text-white/45">
                  Información solicitada
                </div>
                <div className="mt-2 text-sm text-white/70">
                  Nombre, correo y {form.fields.length} campo{form.fields.length === 1 ? "" : "s"} personalizado{form.fields.length === 1 ? "" : "s"}.
                </div>
              </div>
              <Link
                href={`/demo/eventos/${eventId}/registro` as never}
                className="block w-full border border-white bg-white px-4 py-3 text-center text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90"
              >
                Registrarme
              </Link>
              <p className="text-xs leading-5 text-white/45">
                Demo web local. No cobra, no emite ticket real y no toca el flujo móvil.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
