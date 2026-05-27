import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { PaymentDetailButton } from "@/app/(dashboard)/payments/_components/PaymentDetailButton";
import { ProviderStatusActions } from "@/app/(dashboard)/providers/_components/ProviderStatusActions";
import {
  countTicketsForProviderEvents,
  listEventPaymentsForProvider,
  listProviderAuditLogs,
  loadProviderEvents,
  loadProviderSubscriptionOrders,
  resolveProviderForUser,
} from "@/lib/admin/providerDetail";
import {
  getUserById,
  type AdminUserRecord,
  type ProviderStatus,
} from "@/lib/admin/users";
import { Calendar, Receipt, Ticket, Wallet } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<string, string> = {
  pendiente: "Prueba (sin plan)",
  single_event: "Evento Único",
  basico: "Básico",
  pro: "Pro",
};

const STATUS_LABEL: Record<ProviderStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  paused: "Pausado",
  suspended: "Suspendido",
};

const STATUS_VARIANT: Record<
  ProviderStatus,
  "success" | "warning" | "muted" | "danger"
> = {
  pending: "warning",
  approved: "success",
  paused: "muted",
  suspended: "danger",
};

const EVENT_STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  sold_out: "Agotado",
  ended: "Finalizado",
  suspended: "Suspendido",
};

const EVENT_STATUS_VARIANT: Record<
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

const AUDIT_ACTION_LABEL: Record<string, string> = {
  "provider.status_change": "Cambio de estado",
  "provider.plan_change": "Cambio de plan",
  "provider.comercio_create": "Alta de comercio",
  "provider.invite_resend": "Reenvío de invitación",
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

function subscriptionSummary(p: AdminUserRecord): string {
  const planLabel = PLAN_LABEL[p.subscriptionPlan ?? "pendiente"] ?? "Prueba";
  const isPlan =
    p.subscriptionPlan === "single_event" ||
    p.subscriptionPlan === "basico" ||
    p.subscriptionPlan === "pro";
  if (isPlan && p.subscriptionPeriodEnd) {
    return `${planLabel} · renueva ${formatDate(p.subscriptionPeriodEnd)}`;
  }
  if (p.freeTrialEnd) {
    const ended = new Date(p.freeTrialEnd).getTime() < Date.now();
    return ended
      ? `${planLabel} · prueba vencida (${formatDate(p.freeTrialEnd)})`
      : `${planLabel} · prueba hasta ${formatDate(p.freeTrialEnd)}`;
  }
  return planLabel;
}

function auditSummary(row: {
  action: string;
  stateBefore: Record<string, unknown>;
  stateAfter: Record<string, unknown>;
}): string {
  if (row.action === "provider.status_change") {
    const from = row.stateBefore.providerStatus;
    const to = row.stateAfter.providerStatus;
    if (from && to) return `${String(from)} → ${String(to)}`;
  }
  if (row.action === "provider.plan_change") {
    const from = row.stateBefore.subscription_plan;
    const to = row.stateAfter.subscription_plan;
    if (to) {
      return from
        ? `${PLAN_LABEL[String(from)] ?? from} → ${PLAN_LABEL[String(to)] ?? to}`
        : `Plan: ${PLAN_LABEL[String(to)] ?? to}`;
    }
  }
  if (row.action === "provider.invite_resend") {
    const email = row.stateAfter.email;
    if (email) return `Correo: ${String(email)}`;
  }
  return "";
}

export default async function ProviderDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const providerUser = await getUserById(userId);

  if (!providerUser || providerUser.role !== "provider") {
    notFound();
  }

  const { provider, members } = await resolveProviderForUser(userId);
  const providerId = provider?.id ?? null;

  const [eventsData, subscriptionOrders, eventPayments, ticketStats, auditLogs] =
    await Promise.all([
      providerId ? loadProviderEvents(providerId) : Promise.resolve({ total: 0, items: [] }),
      loadProviderSubscriptionOrders(userId),
      providerId
        ? listEventPaymentsForProvider(providerId)
        : Promise.resolve([]),
      providerId
        ? countTicketsForProviderEvents(providerId)
        : Promise.resolve({ total: 0, active: 0 }),
      listProviderAuditLogs(userId, providerId),
    ]);

  const events = eventsData.items;
  const status = providerUser.providerStatus ?? "pending";
  const displayName =
    providerUser.brandName ??
    provider?.name ??
    providerUser.fullName ??
    providerUser.email.split("@")[0];

  const paidEventGmv = eventPayments
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.amountCents, 0);
  const paidSubCents = subscriptionOrders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.amountCents, 0);
  const revalidatePath = `/providers/${userId}`;

  return (
    <div>
      <PageHeader
        eyebrow="Comercios"
        title={displayName}
        description={`${providerUser.email}${providerUser.brandHandle ? ` · ${providerUser.brandHandle}` : ""}`}
        action={
          <Link
            href="/providers"
            className="border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/5"
          >
            ← Volver
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill
            label={STATUS_LABEL[status]}
            variant={STATUS_VARIANT[status]}
          />
          <span className="text-sm text-muted">{subscriptionSummary(providerUser)}</span>
        </div>
        <ProviderStatusActions
          userId={userId}
          status={status}
          emailConfirmedAt={providerUser.emailConfirmedAt}
          revalidatePath={revalidatePath}
        />
      </div>

      <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Eventos"
          value={eventsData.total.toLocaleString()}
          hint={`${events.filter((e) => e.status === "published").length} publicados`}
          icon={Calendar}
        />
        <KpiCard
          label="Tickets emitidos"
          value={ticketStats.active.toLocaleString()}
          hint={`${ticketStats.total.toLocaleString()} totales`}
          icon={Ticket}
        />
        <KpiCard
          label="Ventas de eventos"
          value={money(paidEventGmv)}
          hint={`${eventPayments.filter((o) => o.status === "paid").length} órdenes pagadas`}
          icon={Wallet}
        />
        <KpiCard
          label="Suscripción"
          value={money(paidSubCents)}
          hint={`${subscriptionOrders.filter((o) => o.status === "paid").length} pagos Paygate`}
          icon={Receipt}
        />
      </section>

      <Section title="Información">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Correo" value={providerUser.email} />
          <InfoItem
            label="Handle"
            value={providerUser.brandHandle ?? provider?.handle ?? "—"}
          />
          <InfoItem label="Estado comercio" value={STATUS_LABEL[status]} />
          <InfoItem label="Plan" value={PLAN_LABEL[providerUser.subscriptionPlan ?? "pendiente"] ?? "Prueba"} />
          <InfoItem
            label="Estado suscripción"
            value={providerUser.subscriptionStatus ?? "—"}
          />
          <InfoItem
            label="Fin de prueba"
            value={formatDate(providerUser.freeTrialEnd ?? null)}
          />
          <InfoItem
            label="Renovación plan"
            value={formatDate(providerUser.subscriptionPeriodEnd ?? null)}
          />
          <InfoItem label="Alta cuenta" value={formatDate(providerUser.createdAt)} />
          <InfoItem
            label="Último acceso"
            value={formatDate(providerUser.lastSignInAt)}
          />
          {provider ? (
            <>
              <InfoItem label="ID comercio" value={provider.id.slice(0, 8) + "…"} />
              <InfoItem
                label="Comercio creado"
                value={formatDate(provider.createdAt)}
              />
              <InfoItem
                label="Sitio web"
                value={provider.websiteUrl ?? "—"}
              />
            </>
          ) : null}
        </dl>
        {provider?.description ? (
          <p className="mt-4 text-sm text-white/70">{provider.description}</p>
        ) : null}
      </Section>

      {members.length > 0 ? (
        <Section title="Equipo">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Miembro</th>
                  <th className="py-2 pr-4">Rol</th>
                  <th className="py-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b border-white/8 last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium">{m.fullName ?? m.email ?? m.userId.slice(0, 8)}</div>
                      {m.email ? (
                        <div className="text-xs text-muted">{m.email}</div>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-4 capitalize">{m.role}</td>
                    <td className="py-2.5">
                      <StatusPill
                        label={m.active ? "Activo" : "Inactivo"}
                        variant={m.active ? "success" : "muted"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      <Section
        title="Eventos"
        action={
          providerId ? (
            <Link
              href={`/events?providerId=${encodeURIComponent(providerId)}` as never}
              className="text-[10px] font-bold uppercase tracking-wide text-[#F67010] hover:underline"
            >
              Ver en catálogo →
            </Link>
          ) : null
        }
      >
        {events.length === 0 ? (
          <EmptyState text="Sin eventos registrados para este comercio." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Evento</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Inicio</th>
                  <th className="py-2 pr-4">Ciudad</th>
                  <th className="py-2 text-right">Capacidad</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id} className="border-b border-white/8 last:border-0">
                    <td className="py-2.5 pr-4 font-medium">{ev.title}</td>
                    <td className="py-2.5 pr-4">
                      <StatusPill
                        label={EVENT_STATUS_LABEL[ev.status] ?? ev.status}
                        variant={EVENT_STATUS_VARIANT[ev.status] ?? "muted"}
                      />
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted">
                      {formatDateTime(ev.startsAt)}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted">
                      {ev.city ?? "—"}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {ev.capacity.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Ventas de eventos">
        {eventPayments.length === 0 ? (
          <EmptyState text="Sin órdenes de pago de entradas." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Evento</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4 text-right">Cant.</th>
                  <th className="py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {eventPayments.map((o) => (
                  <tr key={o.id} className="border-b border-white/8 last:border-0">
                    <td className="py-2.5 pr-4 text-xs text-muted">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4">{o.eventTitle}</td>
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

      <Section title="Facturación · suscripción">
        {subscriptionOrders.length === 0 ? (
          <EmptyState text="Sin pagos de suscripción vía Paygate." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4 text-right">Monto</th>
                  <th className="py-2 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionOrders.map((o) => (
                  <tr key={o.id} className="border-b border-white/8 last:border-0">
                    <td className="py-2.5 pr-4 text-xs text-muted">
                      {formatDate(o.createdAt)}
                    </td>
                    <td className="py-2.5 pr-4">
                      {PLAN_LABEL[o.planId] ?? o.planId}
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill
                        label={ORDER_STATUS_LABEL[o.status] ?? o.status}
                        variant={ORDER_STATUS_VARIANT[o.status] ?? "muted"}
                      />
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">
                      {money(o.amountCents, o.currency)}
                    </td>
                    <td className="py-2.5 text-right">
                      <PaymentDetailButton order={o} comercio={displayName} />
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
          <EmptyState text="Sin registros de auditoría para este comercio." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">Acción</th>
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
                      {AUDIT_ACTION_LABEL[row.action] ?? row.action}
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
                      {auditSummary(row)}
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
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="futuristic-panel mb-6 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wide">{title}</h2>
        {action}
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
      <dd className="mt-1 text-sm text-white/90 break-all">{value}</dd>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-sm text-muted">{text}</p>;
}
