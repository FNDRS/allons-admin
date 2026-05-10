import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { getAdminOverviewMetrics } from "@/lib/admin/eventsApi";
import { listAllUsers } from "@/lib/admin/users";
import {
  Activity,
  Calendar,
  CircleDollarSign,
  ScanLine,
  Store,
  Ticket,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Counts {
  clients: number;
  providers: number;
  staff: number;
  signupsLast24h: number;
  pendingProviders: number;
  suspended: number;
}

interface OverviewMetrics {
  activeEvents: number;
  tickets30d: number;
  scans30d: number;
  gmv30d: number | null;
  connected: boolean;
}

async function loadCounts(): Promise<Counts> {
  try {
    const users = await listAllUsers();
    const day = 24 * 60 * 60 * 1000;
    const now = Date.now();
    let clients = 0;
    let providers = 0;
    let staff = 0;
    let signups = 0;
    let pendingProviders = 0;
    let suspended = 0;

    for (const u of users) {
      if (u.role === "provider") providers += 1;
      else if (u.role === "staff") staff += 1;
      else clients += 1;

      if (u.status === "suspended") suspended += 1;
      if (u.role === "provider" && u.providerStatus === "pending") {
        pendingProviders += 1;
      }
      const created = new Date(u.createdAt).getTime();
      if (!Number.isNaN(created) && now - created <= day) signups += 1;
    }

    return {
      clients,
      providers,
      staff,
      signupsLast24h: signups,
      pendingProviders,
      suspended,
    };
  } catch (error) {
    console.error("[overview] failed to load counts", error);
    return {
      clients: 0,
      providers: 0,
      staff: 0,
      signupsLast24h: 0,
      pendingProviders: 0,
      suspended: 0,
    };
  }
}

function formatCurrency(value: number) {
  return `L. ${value.toLocaleString("es-HN", { maximumFractionDigits: 0 })}`;
}

async function loadOverviewMetrics(): Promise<OverviewMetrics> {
  try {
    const metrics = await getAdminOverviewMetrics();
    return { ...metrics, connected: true };
  } catch (error) {
    console.error("[overview] failed to load admin overview metrics", error);
    return {
      activeEvents: 0,
      tickets30d: 0,
      scans30d: 0,
      gmv30d: null,
      connected: false,
    };
  }
}

export default async function OverviewPage() {
  const [counts, metrics] = await Promise.all([
    loadCounts(),
    loadOverviewMetrics(),
  ]);

  return (
    <div>
      <PageHeader
        eyebrow="Panel root"
        title="Overview"
        description="Salud de la plataforma con métricas agregadas en tiempo real desde admin API."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Clientes"
          value={counts.clients.toLocaleString()}
          hint="Usuarios registrados"
          icon={Users}
        />
        <KpiCard
          label="Proveedores"
          value={counts.providers.toLocaleString()}
          hint={`${counts.pendingProviders} pendientes`}
          icon={Store}
        />
        <KpiCard
          label="Staff"
          value={counts.staff.toLocaleString()}
          hint="Equipos invitados"
          icon={Activity}
        />
        <KpiCard
          label="Altas 24 h"
          value={counts.signupsLast24h.toLocaleString()}
          hint="Sign-ups recientes"
          icon={Users}
        />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Eventos activos"
          value={metrics.activeEvents.toLocaleString()}
          hint={
            metrics.connected ? "Publicados y vigentes" : "Sin conexión a Admin API"
          }
          icon={Calendar}
        />
        <KpiCard
          label="Tickets 30 d"
          value={metrics.tickets30d.toLocaleString()}
          hint={metrics.connected ? "Emitidos últimos 30 días" : "Sin conexión"}
          icon={Ticket}
        />
        <KpiCard
          label="GMV 30 d"
          value={formatCurrency(metrics.gmv30d ?? 0)}
          hint={metrics.gmv30d === null ? "Pasarela pendiente" : "Venta bruta 30 días"}
          icon={CircleDollarSign}
        />
        <KpiCard
          label="Escaneos 30 d"
          value={metrics.scans30d.toLocaleString()}
          hint={metrics.connected ? "Check-ins válidos" : "Sin conexión"}
          icon={ScanLine}
        />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="futuristic-panel p-6">
          <div className="eyebrow mb-4">Estado del sistema</div>
          <div className="space-y-3 text-sm">
            <Row
              label="Auth (Supabase)"
              value={<StatusPill label="Operativo" variant="success" />}
            />
            <Row
              label="Edge function · invite-staff"
              value={<StatusPill label="Operativo" variant="success" />}
            />
            <Row
              label="Métricas de eventos"
              value={
                <StatusPill
                  label={metrics.connected ? "Operativo" : "Pendiente"}
                  variant={metrics.connected ? "success" : "warning"}
                />
              }
            />
            <Row
              label="Pasarela de pagos"
              value={<StatusPill label="No conectado" variant="danger" />}
            />
            <Row
              label="Cuentas suspendidas"
              value={
                <span className="text-sm font-bold text-danger">
                  {counts.suspended}
                </span>
              }
            />
          </div>
        </div>

        <div className="futuristic-panel p-6">
          <div className="eyebrow mb-4">Próximos pasos</div>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted">
            <li>Exponer tabla de eventos vía RPC para conectar Overview y Eventos.</li>
            <li>Auditoría de acciones del root (suspender, aprobar) en Postgres.</li>
            <li>Webhook de Auth para alertas de signups masivos.</li>
            <li>Conectar payouts y métricas de GMV en Finanzas.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-white/8 pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted">{label}</span>
      {value}
    </div>
  );
}
