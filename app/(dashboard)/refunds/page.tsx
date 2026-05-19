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
          value="—"
          hint="Error al cargar"
          icon={CircleDollarSign}
        />
        <KpiCard label="Pendientes" value="—" hint="Error" icon={Hourglass} />
        <KpiCard label="Fallidos" value="—" hint="Error" icon={AlertTriangle} />
        <KpiCard label="Total" value="—" hint="Error" icon={Receipt} />
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
        hint="Solicitados o aprobados sin pagar"
        icon={Hourglass}
      />
      <KpiCard
        label="Fallidos"
        value={String(failed)}
        hint="Requieren intervención manual"
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

function DisputesPanel() {
  return (
    <div className="futuristic-panel p-6">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="eyebrow mb-1">Disputas / Chargebacks</div>
          <div className="text-sm text-white/80">
            Casos abiertos con el banco vía Paygate
          </div>
        </div>
        <div className="flex h-7 w-7 items-center justify-center border border-white/15">
          <ShieldAlert size={13} />
        </div>
      </div>
      <div className="mt-6 border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center text-sm text-muted">
        <div className="font-semibold text-white/80">
          Sin integración activa
        </div>
        <div className="mt-2 leading-relaxed">
          Paygate todavía no envía webhooks de disputa/chargeback. Cuando lo
          habiliten, los casos abiertos aparecerán acá con monto, motivo y
          fecha límite de respuesta. Mientras tanto el banco notifica por
          correo y el equipo de ops lo registra manualmente.
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
    <div>
      <PageHeader
        eyebrow="Tesorería"
        title="Reembolsos y disputas"
        description="Reembolsos solicitados desde la app y chargebacks abiertos con el banco."
      />

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
        <div className="eyebrow mb-4">Reembolsos</div>
        <RefundsSection />
      </section>

      <section className="mt-8">
        <DisputesPanel />
      </section>
    </div>
  );
}
