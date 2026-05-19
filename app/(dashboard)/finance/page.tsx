import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { OrdersSection } from "@/components/OrdersSection";
import { PaymentsChart } from "@/components/PaymentsChart";
import {
  ArrowUpRight,
  CircleDollarSign,
  CreditCard,
  Plug,
  Wallet,
} from "lucide-react";
import { Suspense } from "react";
import { StatusPill } from "@/components/StatusPill";
import { getPaymentsSummary } from "@/lib/admin/paymentsApi";
import { getRecentPayouts } from "@/lib/admin/payoutsApi";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return `L. ${value.toLocaleString("es-HN", { maximumFractionDigits: 0 })}`;
}

const PAYOUT_STATUS_META: Record<
  string,
  { label: string; variant: "success" | "warning" | "danger" | "info" | "muted" }
> = {
  pending: { label: "Pendiente", variant: "warning" },
  completed: { label: "Completado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "muted" },
  rejected: { label: "Rechazado", variant: "danger" },
};

async function PaymentsSummaryCards() {
  let summary;
  try {
    summary = await getPaymentsSummary();
  } catch {
    return (
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="GMV (30 d)" value="—" hint="Error al cargar" icon={CircleDollarSign} />
        <KpiCard label="Fee plataforma" value="—" hint="Error al cargar" icon={CreditCard} />
        <KpiCard label="Pagado a proveedores" value="—" hint="Error al cargar" icon={ArrowUpRight} />
        <KpiCard label="Saldo pendiente" value="—" hint="Error al cargar" icon={Wallet} />
      </section>
    );
  }

  const feeCents = Math.round(summary.gmvCents * 0.06);
  const paidCents = summary.gmvCents - feeCents;

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="GMV (30 d)"
          value={formatCurrency(summary.gmvCents / 100)}
          hint="Volumen bruto"
          icon={CircleDollarSign}
        />
        <KpiCard
          label="Fee plataforma"
          value={formatCurrency(feeCents / 100)}
          hint="6% del GMV"
          icon={CreditCard}
        />
        <KpiCard
          label="Pagado a proveedores"
          value={formatCurrency(paidCents / 100)}
          hint="Payouts completados"
          icon={ArrowUpRight}
        />
        <KpiCard
          label="Órdenes pagadas"
          value={String(summary.paidOrdersCount)}
          hint={`${summary.pendingOrdersCount} pendientes · ${summary.failedOrdersCount} fallidas`}
          icon={Wallet}
        />
        {summary.stalePendingCount > 0 && (
          <KpiCard
            label="Pendientes estancadas"
            value={String(summary.stalePendingCount)}
            hint="Más de 1h sin actualizar"
            icon={Plug}
          />
        )}
      </section>
      <PaymentsChart data={summary.daily} />
    </>
  );
}

async function RecentPayoutsPanel() {
  try {
    const { items } = await getRecentPayouts(25);
    if (items.length === 0) {
      return (
        <div className="px-0 py-6 text-center text-sm leading-relaxed text-muted">
          No hay solicitudes de retiro registradas. Los comercios las crean desde la app
          en <span className="text-white/70">Finanzas → retiro</span>. Los cobros con pasarela
          aparecen arriba en <span className="text-white/70">Órdenes</span>; esta lista es solo
          el flujo de desembolsos que gestionamos nosotros.
        </div>
      );
    }

    return (
      <div className="-mx-2 overflow-x-auto">
        <div
          className="grid min-w-[640px] border-b border-white/12 bg-white/[0.02] px-2 py-3 text-[10px] font-bold uppercase tracking-wide text-muted"
          style={{ gridTemplateColumns: "110px 100px 1fr 120px 1fr" }}
        >
          <div>Estado</div>
          <div className="text-right">Monto</div>
          <div>Comercio</div>
          <div>Fecha</div>
          <div>Método</div>
        </div>
        {items.map((row) => {
          const meta = PAYOUT_STATUS_META[row.status] ?? {
            label: row.status,
            variant: "muted" as const,
          };
          return (
            <div
              key={row.id}
              className="grid min-w-[640px] items-center border-b border-white/8 px-2 py-3 text-sm last:border-b-0 hover:bg-white/[0.02]"
              style={{ gridTemplateColumns: "110px 100px 1fr 120px 1fr" }}
            >
              <div>
                <StatusPill label={meta.label} variant={meta.variant} />
              </div>
              <div className="text-right font-bold">
                {formatCurrency(row.amount)}
              </div>
              <div className="truncate pr-2 text-white/90" title={row.providerName}>
                {row.providerName}
              </div>
              <div className="text-[11px] text-muted">
                {new Date(row.createdAt).toLocaleDateString("es-HN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              <div className="truncate font-mono text-[11px] text-muted" title={row.method}>
                {row.method}
              </div>
            </div>
          );
        })}
      </div>
    );
  } catch {
    return (
      <div className="px-0 py-8 text-center text-sm text-red-400">
        No se pudieron cargar los retiros. Revisa la API y{" "}
        <code className="rounded bg-white/10 px-1 text-white/80">ADMIN_API_*</code> en{" "}
        <code className="rounded bg-white/10 px-1 text-white/80">.env.local</code>.
      </div>
    );
  }
}

export default function FinancePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Tesorería"
        title="Finanzas"
        description="Volumen, fees y payouts."
      />

      <Suspense
        fallback={
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="GMV (30 d)" value="…" hint="Cargando" icon={CircleDollarSign} />
            <KpiCard label="Fee plataforma" value="…" hint="Cargando" icon={CreditCard} />
            <KpiCard label="Pagado a proveedores" value="…" hint="Cargando" icon={ArrowUpRight} />
            <KpiCard label="Saldo pendiente" value="…" hint="Cargando" icon={Wallet} />
          </section>
        }
      >
        <PaymentsSummaryCards />
      </Suspense>

      <section className="mt-8">
        <div className="eyebrow mb-4">Órdenes</div>
        <OrdersSection />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="futuristic-panel p-6">
          <div className="eyebrow mb-4">Últimos payouts</div>
          <Suspense
            fallback={
              <div className="py-8 text-center text-sm text-muted">Cargando retiros…</div>
            }
          >
            <RecentPayoutsPanel />
          </Suspense>
        </div>
        <div className="futuristic-panel p-6">
          <div className="eyebrow mb-4">Riesgos / disputas</div>
          <ul className="space-y-3 text-sm">
            <Row
              icon={<ArrowUpRight size={14} />}
              label="Reembolsos 30 d"
              value="0"
            />
            <Row
              icon={<Wallet size={14} />}
              label="Cuentas con saldo retenido"
              value="0"
            />
          </ul>
        </div>
      </section>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-center justify-between border-b border-white/8 pb-3 last:border-b-0 last:pb-0">
      <span className="flex items-center gap-2 text-muted">
        <span className="flex h-6 w-6 items-center justify-center border border-white/15">
          {icon}
        </span>
        {label}
      </span>
      <span className="font-bold">{value}</span>
    </li>
  );
}
