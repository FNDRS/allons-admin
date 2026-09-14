import { DashboardPage } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { getAdminEvent } from "@/lib/admin/eventsApi";
import {
  getDemoEventForm,
  listDemoEventRegistrations,
} from "@/lib/demoEventForms";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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
        eyebrow="Demo Hub"
        title="Respuestas del formulario"
        description={`${event.title} · ${registrations.length.toLocaleString()} registros demo`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/events/${eventId}/formulario/respuestas/export` as never}
              className="border border-white bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90"
            >
              Descargar CSV
            </Link>
            <Link
              href={`/events/${eventId}/formulario` as never}
              className="border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/5"
            >
              ← Formulario
            </Link>
          </div>
        }
      />

      <div className="futuristic-panel min-h-0 flex-1 overflow-auto">
        {registrations.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted">
            Todavía no hay registros en la demo web.
          </div>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="sticky top-0 bg-[#0a0a0a]">
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Fecha</th>
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
              {registrations.map((registration) => {
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
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {formatDateTime(registration.createdAt)}
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
