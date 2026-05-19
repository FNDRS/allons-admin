import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { DataTable, type Column } from "@/components/DataTable";
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

import {
  getPaymentsSummary,
  listPaymentOrders,
  type AdminPaymentOrder,
} from "@/lib/admin/paymentsApi";
import { Suspense } from "react";

const ORDER_STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "muted"> = {
  paid: "success",
  pending_payment: "warning",
  pending: "warning",
  failed: "danger",
  cancelled: "muted",
  refunded: "info",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  paid: "Pagado",
  pending_payment: "Pendiente",
  pending: "Pendiente",
  failed: "Fallido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
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

async function RecentOrdersTable() {
  let result;
  try {
    result = await listPaymentOrders({ limit: 20 });
  } catch {
    return (
      <div className="futuristic-panel p-6 text-center text-sm text-muted">
        Error al cargar órdenes recientes.
      </div>
    );
  }

  const columns: Column<AdminPaymentOrder>[] = [
    {
      key: "status",
      header: "Estado",
      width: "100px",
      render: (row) => (
        <StatusPill
          label={ORDER_STATUS_LABEL[row.status] ?? row.status}
          variant={ORDER_STATUS_VARIANT[row.status] ?? "muted"}
        />
      ),
    },
    {
      key: "amount",
      header: "Monto",
      width: "120px",
      align: "right",
      render: (row) => (
        <span className="font-bold">{formatCurrency(row.amountCents / 100)}</span>
      ),
    },
    {
      key: "qty",
      header: "Cant.",
      width: "60px",
      align: "center",
      render: (row) => `${row.quantity}`,
    },
    {
      key: "createdAt",
      header: "Fecha",
      width: "140px",
      render: (row) =>
        new Date(row.createdAt).toLocaleDateString("es-HN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      key: "id",
      header: "ID",
      width: "1fr",
      render: (row) => (
        <span className="font-mono text-[11px] text-muted">{row.id.slice(0, 8)}…</span>
      ),
    },
  ];

  return (
    <DataTable columns={columns} rows={result.items} rowKey={(r) => r.id} />
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
        <div className="eyebrow mb-4">Órdenes recientes</div>
        <Suspense
          fallback={
            <div className="futuristic-panel p-6 text-center text-sm text-muted">
              Cargando órdenes…
            </div>
          }
        >
          <RecentOrdersTable />
        </Suspense>
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
