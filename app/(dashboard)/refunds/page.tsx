import { DashboardPage, DashboardScroll } from "@/components/DashboardPage";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { RefundsSection } from "@/components/RefundsSection";
import {
  AlertTriangle,
  CircleDollarSign,
  Hourglass,
  Receipt,
  ShieldAlert,
} from "lucide-react";
import { Suspense } from "react";
import { getRefundsSummary } from "@/lib/admin/refundsApi";
import { listRefundRequests } from "@/lib/admin/refundRequestsApi";
import { RefundRequestActions } from "./_components/RefundRequestActions";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return `L. ${value.toLocaleString("es-HN", { maximumFractionDigits: 0 })}`;
}

async function RefundsSummaryCards() {
  let summary;
  try {
    summary = await getRefundsSummary();
  } catch {
    return (
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Pagado (30 d)"
          value="-"
          hint="Error al cargar"
          icon={CircleDollarSign}
        />
        <KpiCard label="Pendientes" value="-" hint="Error" icon={Hourglass} />
        <KpiCard label="Fallidos" value="-" hint="Error" icon={AlertTriangle} />
        <KpiCard label="Total" value="-" hint="Error" icon={Receipt} />
      </section>
    );
  }

  const pending =
    (summary.byStatus.requested ?? 0) + (summary.byStatus.approved ?? 0);
  const failed = summary.byStatus.failed ?? 0;
  const paid = summary.byStatus.paid ?? 0;
  const denied = summary.byStatus.denied ?? 0;

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Pagados (30 d)"
        value={formatCurrency(summary.paidLast30dCents / 100)}
        hint={`${paid} reembolsos pagados en total`}
        icon={CircleDollarSign}
      />
      <KpiCard
        label="Pendientes"
        value={String(pending)}
        hint="Pedidos o aprobados, aún sin pagar"
        icon={Hourglass}
      />
      <KpiCard
        label="Fallidos"
        value={String(failed)}
        hint="Hay que resolverlos a mano"
        icon={AlertTriangle}
      />
      <KpiCard
        label="Total histórico"
        value={String(summary.total)}
        hint={`${denied} denegados`}
        icon={Receipt}
      />
    </section>
  );
}

const REQUEST_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

const REQUEST_STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "muted" | "danger"
> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Las solicitudes que manda el cliente desde la app.
 *
 * Van arriba de los reembolsos ejecutados porque son lo que espera respuesta:
 * aprobar una cancela la entrada y deja el reembolso en la tabla de abajo,
 * que es donde se paga.
 */
async function RefundRequestsSection() {
  let items;
  try {
    ({ items } = await listRefundRequests());
  } catch {
    return (
      <div className="futuristic-panel p-6 text-sm text-muted">
        No se pudieron cargar las solicitudes.
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="futuristic-panel p-6 text-sm text-muted">
        Sin solicitudes de reembolso.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((row) => (
        <div key={row.id} className="futuristic-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{row.subject}</span>
                <StatusPill
                  label={REQUEST_STATUS_LABEL[row.status] ?? row.status}
                  variant={REQUEST_STATUS_VARIANT[row.status] ?? "muted"}
                />
                {!row.emailDelivered ? (
                  <StatusPill label="Sin correo" variant="danger" />
                ) : null}
              </div>
              <div className="mt-1 text-xs text-muted">
                {row.userName ? `${row.userName} · ` : ""}
                {row.userEmail}
                {row.eventTitle ? ` · ${row.eventTitle}` : ""}
                {row.ticketCode ? ` · ${row.ticketCode}` : ""}
                {` · ${formatDateTime(row.createdAt)}`}
              </div>
            </div>
            {row.status === "pending" ? (
              <div className="w-full max-w-sm">
                <RefundRequestActions id={row.id} />
              </div>
            ) : (
              <div className="text-right text-xs text-muted">
                {row.reviewedBy ? `Resuelta por ${row.reviewedBy}` : ""}
                {row.resolutionNote ? (
                  <div className="mt-1 text-white/70">{row.resolutionNote}</div>
                ) : null}
              </div>
            )}
          </div>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/80">
            {row.reason}
          </p>
        </div>
      ))}
    </div>
  );
}

function DisputesPanel() {
  return (
    <div className="futuristic-panel p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="eyebrow mb-1">Disputas / chargebacks</div>
          <div className="text-sm text-white/80">
            Casos abiertos con el banco, vía Paygate
          </div>
        </div>
        <div className="flex h-7 w-7 items-center justify-center border border-white/15">
          <ShieldAlert size={13} />
        </div>
      </div>
      <div className="mt-6 border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-muted">
        <div className="font-semibold text-white/80">
          Paygate aún no manda disputas
        </div>
        <div className="mt-2 leading-relaxed">
          Cuando habiliten el webhook, los casos salen acá con monto, motivo y
          fecha límite. Mientras tanto el banco avisa por correo y ops lo
          anota a mano.
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="border border-white/10 px-3 py-3">
          <div className="eyebrow">Abiertos</div>
          <div className="mt-1 text-xl font-bold">0</div>
        </div>
        <div className="border border-white/10 px-3 py-3">
          <div className="eyebrow">Perdidos</div>
          <div className="mt-1 text-xl font-bold">0</div>
        </div>
        <div className="border border-white/10 px-3 py-3">
          <div className="eyebrow">Ganados</div>
          <div className="mt-1 text-xl font-bold">0</div>
        </div>
      </div>
    </div>
  );
}

export default function RefundsPage() {
  return (
    <DashboardPage>
      <PageHeader
        title="Reembolsos y disputas"
        description="Solicitudes de clientes, reembolsos ejecutados y disputas con el banco."
      />

      <DashboardScroll>
      <Suspense
        fallback={
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Pagados (30 d)"
              value="…"
              hint="Cargando"
              icon={CircleDollarSign}
            />
            <KpiCard
              label="Pendientes"
              value="…"
              hint="Cargando"
              icon={Hourglass}
            />
            <KpiCard
              label="Fallidos"
              value="…"
              hint="Cargando"
              icon={AlertTriangle}
            />
            <KpiCard label="Total" value="…" hint="Cargando" icon={Receipt} />
          </section>
        }
      >
        <RefundsSummaryCards />
      </Suspense>

      <section className="mt-8">
        <div className="eyebrow mb-4">Solicitudes</div>
        <Suspense
          fallback={
            <div className="futuristic-panel p-6 text-sm text-muted">
              Cargando solicitudes…
            </div>
          }
        >
          <RefundRequestsSection />
        </Suspense>
      </section>

      <section className="mt-8">
        <div className="eyebrow mb-4">Reembolsos</div>
        <RefundsSection />
      </section>

      <section className="mt-8">
        <DisputesPanel />
      </section>
      </DashboardScroll>
    </DashboardPage>
  );
}
