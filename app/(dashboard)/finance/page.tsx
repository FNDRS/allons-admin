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

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return `L. ${value.toLocaleString("es-HN", { maximumFractionDigits: 0 })}`;
}

import { getPaymentsSummary } from "@/lib/admin/paymentsApi";
import { Suspense } from "react";

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
          <div className="px-0 py-8 text-center text-sm text-muted">
            Sin movimientos. Conecta una pasarela de pagos para empezar a
            ver retiros aquí.
          </div>
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
