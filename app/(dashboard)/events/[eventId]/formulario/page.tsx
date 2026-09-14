import { DashboardPage, DashboardScroll } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { EventRegistrationFormBuilder } from "@/app/(dashboard)/events/[eventId]/formulario/_components/EventRegistrationFormBuilder";
import { saveDemoRegistrationForm } from "@/app/(dashboard)/events/[eventId]/formulario/actions";
import { getAdminEvent } from "@/lib/admin/eventsApi";
import {
  getDemoEventForm,
  listDemoEventRegistrations,
} from "@/lib/demoEventForms";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function formatDateTime(iso: string | null) {
  if (!iso) return "Fecha por confirmar";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Fecha por confirmar";
  return date.toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EventRegistrationFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ created?: string; saved?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;

  let event: Awaited<ReturnType<typeof getAdminEvent>> | null = null;
  try {
    event = await getAdminEvent(eventId);
  } catch {
    notFound();
  }

  const [form, registrations] = await Promise.all([
    getDemoEventForm(eventId),
    listDemoEventRegistrations(eventId),
  ]);
  const saveAction = saveDemoRegistrationForm.bind(null, eventId);
  const demoUrl = `/demo/eventos/${eventId}`;
  const isSingleEvent = event.eventType === "single";

  return (
    <DashboardPage>
      <PageHeader
        title="Formulario personalizado"
        description="Crea los campos que se pedirán en el registro web de este evento único."
        action={
          <Link
            href={`/events/${eventId}` as never}
            className="inline-flex items-center gap-1.5 border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/5"
          >
            <ArrowLeft size={14} />
            Volver
          </Link>
        }
      />

      <DashboardScroll>
      {query.saved ? (
        <div className="mb-5 border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Formulario guardado. El link público ya usa estos campos.
        </div>
      ) : null}

      {query.created ? (
        <div className="mb-5 border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          Evento creado en las tablas reales. Si quedó publicado, ya aparece en la app cliente.
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="futuristic-panel p-5">
          <div className="eyebrow mb-2">Evento</div>
          <h2 className="text-2xl font-semibold">{event.title}</h2>
          <p className="mt-2 text-sm text-muted">
            {[event.city, event.venue].filter(Boolean).join(" · ") || "Sin ubicación"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
            <span className="border border-white/10 px-2 py-1">
              {formatDateTime(event.startsAt)}
            </span>
            <span className="border border-white/10 px-2 py-1">
              {form.fields.length} campos
            </span>
            <span className="border border-white/10 px-2 py-1">
              {registrations.length} registros web
            </span>
          </div>
        </div>

        <div className="futuristic-panel p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="eyebrow">Registro web</div>
              <h2 className="mt-1 text-xl font-semibold">Registro público</h2>
            </div>
            <StatusPill
              label={isSingleEvent ? "Evento único" : "No soportado"}
              variant={isSingleEvent ? "success" : "warning"}
            />
          </div>
          {!isSingleEvent ? (
            <p className="mb-4 text-sm text-amber-100">
              Este formulario está pensado solo para eventos únicos. Puedes verlo, pero no lo uses para clases recurrentes.
            </p>
          ) : null}
          <div className="break-all border border-white/10 bg-white/[0.03] p-3 text-xs text-white/70">
            {demoUrl}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={demoUrl as never}
              target="_blank"
              className="inline-flex items-center gap-2 border border-white bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90"
            >
              Abrir registro <ExternalLink size={14} />
            </Link>
            <Link
              href={`/events/${eventId}/formulario/respuestas` as never}
              className="border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/5"
            >
              Ver respuestas
            </Link>
          </div>
        </div>
      </section>

      <EventRegistrationFormBuilder
        initialFields={form.fields}
        saveAction={saveAction}
      />
      </DashboardScroll>
    </DashboardPage>
  );
}
