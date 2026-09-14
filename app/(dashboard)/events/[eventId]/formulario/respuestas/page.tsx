import { DashboardPage } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { getAdminEvent } from "@/lib/admin/eventsApi";
import {
  getDemoEventForm,
  listDemoEventRegistrations,
} from "@/lib/demoEventForms";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

/** Día con nombre, para leer de un vistazo si fue fin de semana. */
function formatDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-HN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "hace 3 h" / "ayer": ubica el registro sin tener que leer la fecha. */
function formatRelative(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.round(days / 30);
  return months === 1 ? "hace 1 mes" : `hace ${months} meses`;
}

function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function EventRegistrationResponsesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

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

  return (
    <DashboardPage>
      <PageHeader
        title="Respuestas del formulario"
        description={`${event.title} · ${registrations.length.toLocaleString()} registros web`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href={`/events/${eventId}/formulario/respuestas/export` as never}>
                Descargar CSV
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/events/${eventId}/formulario` as never}>
                <ArrowLeft size={14} />
                Formulario
              </Link>
            </Button>
          </div>
        }
      />

      {registrations.length > 0 ? (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Registros", value: registrations.length.toLocaleString() },
            { label: "Campos del formulario", value: String(form.fields.length) },
            {
              label: "Primer registro",
              value: formatDateTime(
                registrations[registrations.length - 1].createdAt,
              ),
            },
            {
              label: "Último registro",
              value: formatDateTime(registrations[0].createdAt),
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="futuristic-panel px-4 py-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                {stat.label}
              </p>
              <p className="mt-1 text-sm font-medium text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="futuristic-panel min-h-0 flex-1 overflow-auto">
        {registrations.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted">
            Todavía no hay registros desde el formulario web.
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="sticky top-0 bg-[#0a0a0a]">
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Fecha y hora</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                {form.fields.map((field) => (
                  <th key={field.id} className="px-4 py-3">
                    {field.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {registrations.map((registration, index) => {
                const answers = new Map(
                  registration.answers.map((answer) => [
                    answer.questionId,
                    answer.answer,
                  ]),
                );
                return (
                  <tr
                    key={registration.id}
                    className="border-b border-white/8 last:border-0"
                  >
                    <td className="px-4 py-3 text-xs text-muted tabular-nums">
                      {registrations.length - index}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      <div className="text-white/80">
                        {formatDay(registration.createdAt)}
                      </div>
                      <div className="text-muted">
                        {formatTime(registration.createdAt)} ·{" "}
                        {formatRelative(registration.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {registration.attendeeName}
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {registration.attendeeEmail}
                    </td>
                    {form.fields.map((field) => (
                      <td key={field.id} className="px-4 py-3 text-white/70">
                        {answers.get(field.id) || "-"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </DashboardPage>
  );
}
