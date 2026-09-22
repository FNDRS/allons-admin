import { DashboardPage, DashboardScroll } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { EditAdminEventForm } from "@/app/(dashboard)/events/[eventId]/edit/_components/EditAdminEventForm";
import { getAdminEvent, getAdminEventFees, getAdminEventForm, listAdminEventTicketTypes } from "@/lib/admin/eventsApi";
import { normalizeDemoFormFields } from "@/lib/eventFormFields";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Local calendar pieces so the action can rebuild the same instant. */
function splitLocalDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "", time: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

export default async function EditAdminEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  let event: Awaited<ReturnType<typeof getAdminEvent>>;
  try {
    event = await getAdminEvent(eventId);
  } catch {
    notFound();
  }

  const start = splitLocalDateTime(event.startsAt);
  const end = splitLocalDateTime(event.endsAt);
  const galleryUrls = event.galleryUrls ?? [];
  const cover = event.coverImageUrl;
  const images = [
    ...(cover ? [{ url: cover }] : []),
    ...galleryUrls
      .filter((url) => url !== cover)
      .map((url) => ({ url })),
  ];

  const location =
    event.latitude != null && event.longitude != null
      ? {
          latitude: event.latitude,
          longitude: event.longitude,
          address: event.address,
          city: event.city,
        }
      : null;

  const [form, ticketTypes] = await Promise.all([
    getAdminEventForm(eventId).catch(() => null),
    listAdminEventTicketTypes(eventId).catch(() => null),
  ]);
  const pricedTicket = ticketTypes?.items.find((ticket) => ticket.price > 0);
  const fees = await getAdminEventFees(
    eventId,
    pricedTicket ? Math.round(pricedTicket.price * 100) : undefined,
  ).catch(() => null);

  return (
    <DashboardPage>
      <PageHeader
        title="Editar evento"
        description={event.title}
        action={
          <Button asChild size="sm" variant="outline">
            <Link href={`/events/${eventId}` as never}>
              <ArrowLeft size={14} />
              Volver
            </Link>
          </Button>
        }
      />
      <DashboardScroll>
        <EditAdminEventForm
          eventId={eventId}
          providerName={event.provider?.name ?? "Sin comercio"}
          initial={{
            title: event.title,
            description: event.description ?? "",
            capacity: String(event.capacity),
            venue: event.venue ?? "",
            date: start.date,
            time: start.time,
            endTime: end.time,
            category: event.category,
            themeColor: event.themeColor,
            images,
            location,
            kitPickupInfo: event.kitPickupInfo ?? "",
            formFields: form ? normalizeDemoFormFields(form.fields) : null,
            ticketTypes: ticketTypes?.items ?? null,
            fees,
            hasPricedTicket: pricedTicket !== undefined,
          }}
        />
      </DashboardScroll>
    </DashboardPage>
  );
}
