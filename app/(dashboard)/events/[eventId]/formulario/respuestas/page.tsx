import { EventRegistrationResponses } from "@/components/admin/EventRegistrationResponses";
import { DashboardPage, DashboardScroll } from "@/components/DashboardPage";
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

      <DashboardScroll>
        <EventRegistrationResponses
          fields={form.fields}
          registrations={registrations}
        />
      </DashboardScroll>
    </DashboardPage>
  );
}
