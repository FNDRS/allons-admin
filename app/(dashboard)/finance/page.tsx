import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import {
  ArrowDownLeft,
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
    </section>
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
              icon={<ArrowDownLeft size={14} />}
              label="Chargebacks 30 d"
              value="0"
            />
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

      <section className="futuristic-panel mt-8 flex flex-col items-center gap-4 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center border border-white/15">
          <Plug size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-tight">
            Pasarela pendiente
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Cuando integremos la pasarela (Stripe / BAC / Tigo Money), esta
            página mostrará GMV, fees, payouts y disputas en tiempo real, con
            la posibilidad de iniciar liquidaciones manuales por proveedor.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Plug size={14} />
          <span className="text-muted">Sin conexión</span>
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
