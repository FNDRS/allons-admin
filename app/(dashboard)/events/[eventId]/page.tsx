import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { EventStatusActions } from "@/app/(dashboard)/events/_components/EventStatusActions";
import {
  countEventTickets,
  listEventAuditLogs,
  listEventTicketTypes,
  loadEventPaymentOrders,
  resolveProviderOwnerUserId,
} from "@/lib/admin/eventDetail";
import { getAdminEvent } from "@/lib/admin/eventsApi";
import { CircleDollarSign, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  sold_out: "Agotado",
  ended: "Finalizado",
  suspended: "Suspendido",
};

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "muted" | "danger"
> = {
  draft: "muted",
  published: "success",
  sold_out: "warning",
  ended: "muted",
  suspended: "danger",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

const ORDER_STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "muted" | "danger"
> = {
  pending_payment: "warning",
  paid: "success",
  failed: "danger",
  cancelled: "muted",
  refunded: "muted",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(cents: number, currency = "HNL"): string {
  return `${currency === "HNL" ? "L. " : ""}${(cents / 100).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function eventTypeLabel(eventType: string): string {
  if (eventType === "recurring_class") return "Clase recurrente";
  return "Evento único";
}

export default async function EventDetailPage({
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

  const [ticketStats, ticketTypes, paymentOrders, auditLogs, providerOwnerId] =
    await Promise.all([
      countEventTickets(eventId),
      listEventTicketTypes(eventId),
      loadEventPaymentOrders(eventId),
      listEventAuditLogs(eventId),
      resolveProviderOwnerUserId(event.providerId),
    ]);

  const status = event.status ?? "draft";
  const paidGmv = paymentOrders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.amountCents, 0);
  const ticketsSold = ticketTypes.reduce((sum, t) => sum + t.soldCount, 0);
  const revalidatePath = `/events/${eventId}`;

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title={event.title}
        description={[event.city, event.venue].filter(Boolean).join(" · ") || "Sin ubicación"}
        action={
          <Link
            href="/events"
            className="border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/5"
          >
            ← Volver
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {event.themeColor ? (
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: event.themeColor }}
            />
          ) : null}
          <StatusPill
            label={STATUS_LABEL[status] ?? status}
            variant={STATUS_VARIANT[status] ?? "muted"}
          />
          <span className="text-sm text-muted">{eventTypeLabel(event.eventType)}</span>
        </div>
        <EventStatusActions
          eventId={eventId}
          status={status}
          revalidatePath={revalidatePath}
        />
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Aforo"
          value={event.capacity.toLocaleString()}
          hint={event.ticketMode === "free" ? "Entrada libre" : "Capacidad declarada"}
          icon={Users}
        />
        <KpiCard
          label="Tickets emitidos"
          value={ticketStats.active.toLocaleString()}
          hint={`${ticketStats.total.toLocaleString()} totales`}
          icon={Ticket}
        />
        <KpiCard
          label="Ventas"
          value={money(paidGmv)}
          hint={`${paymentOrders.filter((o) => o.status === "paid").length} órdenes pagadas`}
          icon={CircleDollarSign}
        />
        <KpiCard
          label="Tipos de entrada"
          value={ticketTypes.length.toLocaleString()}
          hint={`${ticketsSold.toLocaleString()} vendidos en tiers`}
          icon={Ticket}
        />
      </section>

      <Section title="Información">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Estado" value={STATUS_LABEL[status] ?? status} />
          <InfoItem label="Inicio" value={formatDateTime(event.startsAt)} />
          <InfoItem label="Fin" value={formatDateTime(event.endsAt)} />
          <InfoItem label="Ciudad" value={event.city ?? "—"} />
          <InfoItem label="Lugar" value={event.venue ?? "—"} />
          <InfoItem label="Dirección" value={event.address ?? "—"} />
          <InfoItem label="Modo tickets" value={event.ticketMode} />
          <InfoItem label="Recurrencia" value={event.recurrence ?? "—"} />
          <InfoItem
            label="Edad mínima"
            value={event.minAge != null ? `${event.minAge}+` : "—"}
          />
          <InfoItem
            label="Comercio"
            value={event.provider?.name ?? "—"}
          />
          <InfoItem label="Creado" value={formatDate(event.createdAt)} />
          <InfoItem label="Actualizado" value={formatDate(event.updatedAt)} />
        </dl>
        {event.description ? (
          <p className="mt-4 text-sm text-white/70 whitespace-pre-wrap">
            {event.description}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
          {event.smokingAllowed ? (
            <span className="border border-white/10 px-2 py-1">Fumadores OK</span>
          ) : null}
          {event.petFriendly ? (
            <span className="border border-white/10 px-2 py-1">Pet friendly</span>
          ) : null}
          {event.parkingAvailable ? (
            <span className="border border-white/10 px-2 py-1">Estacionamiento</span>
          ) : null}
        </div>
        {providerOwnerId && event.provider ? (
          <p className="mt-4 text-sm">
            <Link
              href={`/providers/${providerOwnerId}` as never}
              className="font-bold text-[#F67010] hover:underline"
            >
              Ver comercio →
            </Link>
          </p>
        ) : null}
      </Section>

      {ticketTypes.length > 0 ? (
        <Section title="Tipos de entrada">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4 text-right">Precio</th>
                  <th className="py-2 pr-4 text-right">Vendidos</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {ticketTypes.map((t) => (
                  <tr key={t.id} className="border-b border-white/8 last:border-0">
                    <td className="py-2.5 pr-4 font-medium">
                      {t.name}
                      {!t.active ? (
                        <span className="ml-2 text-xs text-muted">(inactivo)</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {money(Math.round(t.price * 100))}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {t.soldCount}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">{t.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      <Section title="Órdenes de pago">
        {paymentOrders.length === 0 ? (
          <p className="text-sm text-muted">Sin órdenes de pago para este evento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4 text-right">Cant.</th>
                  <th className="py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {paymentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-white/8 last:border-0">
                    <td className="py-2.5 pr-4 text-xs text-muted">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill
                        label={ORDER_STATUS_LABEL[o.status] ?? o.status}
                        variant={ORDER_STATUS_VARIANT[o.status] ?? "muted"}
                      />
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {o.quantity}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {money(o.amountCents, o.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Historial de auditoría">
        {auditLogs.length === 0 ? (
          <p className="text-sm text-muted">Sin cambios registrados para este evento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Resultado</th>
                  <th className="py-2 pr-4">Actor</th>
                  <th className="py-2">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((row) => (
                  <tr key={row.id} className="border-b border-white/8 last:border-0">
                    <td className="py-2.5 pr-4 text-xs text-muted whitespace-nowrap">
                      {formatDateTime(row.occurredAt)}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill
                        label={row.outcome === "success" ? "OK" : "Fallo"}
                        variant={row.outcome === "success" ? "success" : "danger"}
                      />
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted">
                      {row.actorEmail ?? "—"}
                    </td>
                    <td className="py-2.5 text-xs text-white/60">
                      {row.stateAfter.status
                        ? `Estado: ${String(row.stateAfter.status)}`
                        : row.stateAfter.status_attempted
                          ? `Intento: ${String(row.stateAfter.status_attempted)}`
                          : "Cambio de estado"}
                      {row.errorMessage ? (
                        <span className="block text-danger">{row.errorMessage}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="futuristic-panel mb-6 overflow-hidden">
      <div className="border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-white/90 break-words">{value}</dd>
    </div>
  );
}
