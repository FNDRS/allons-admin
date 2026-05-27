import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { getAdminOverviewMetrics, getAdminPlatformStatus } from "@/lib/admin/eventsApi";
import { listAllUsers } from "@/lib/admin/users";
import {
  Activity,
  Bug,
  Calendar,
  CircleDollarSign,
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
}

interface OverviewMetrics {
  activeEvents: number;
  totalEvents: number;
  tickets30d: number;
  posthogErrors30d: number | null;
  gmv30d: number | null;
  connected: boolean;
}

type PaygateStatus = {
  connected: boolean;
  configured: boolean;
  connectivityStatus: string;
};

async function loadPaygateStatus(): Promise<PaygateStatus> {
  try {
    const status = await getAdminPlatformStatus();
    return {
      connected: true,
      configured: Boolean(status.paygate?.configured),
      connectivityStatus: String(status.paygate?.connectivityStatus ?? 'unknown'),
    };
  } catch (error) {
    console.error('[overview] failed to load paygate status', error);
    return { connected: false, configured: false, connectivityStatus: 'unknown' };
  }
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

    for (const u of users) {
      if (u.role === "provider") providers += 1;
      else if (u.role === "staff") staff += 1;
      else clients += 1;

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
    };
  } catch (error) {
    console.error("[overview] failed to load counts", error);
    return {
      clients: 0,
      providers: 0,
      staff: 0,
      signupsLast24h: 0,
      pendingProviders: 0,
    };
  }
}

function formatCurrency(value: number) {
  return `L. ${value.toLocaleString("es-HN", { maximumFractionDigits: 0 })}`;
}

async function loadOverviewMetrics(): Promise<OverviewMetrics> {
  try {
    const metrics = await getAdminOverviewMetrics();
    return {
      activeEvents: metrics.activeEvents,
      totalEvents: metrics.totalEvents ?? metrics.activeEvents,
      tickets30d: metrics.tickets30d,
      posthogErrors30d: metrics.posthogErrors30d,
      gmv30d: metrics.gmv30d,
      connected: true,
    };
  } catch (error) {
    console.error("[overview] failed to load admin overview metrics", error);
    return {
      activeEvents: 0,
      totalEvents: 0,
      tickets30d: 0,
      posthogErrors30d: null,
      gmv30d: null,
      connected: false,
    };
  }
}

export default async function OverviewPage() {
  const [counts, metrics, paygate] = await Promise.all([
    loadCounts(),
    loadOverviewMetrics(),
    loadPaygateStatus(),
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
            metrics.connected
              ? metrics.totalEvents > metrics.activeEvents
                ? `${metrics.totalEvents.toLocaleString()} en catálogo (incl. borradores o vencidos)`
                : "Publicados, agotados y vigentes"
              : "Sin conexión a Admin API"
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
          value={
            metrics.gmv30d === null ? '—' : formatCurrency(metrics.gmv30d)
          }
          hint={
            metrics.gmv30d === null ? 'Pendiente de pasarela' : 'Venta bruta 30 días'
          }
          icon={CircleDollarSign}
        />
        <KpiCard
          label="Errores 30 d"
          value={
            metrics.posthogErrors30d === null
              ? "—"
              : metrics.posthogErrors30d.toLocaleString()
          }
          hint={
            metrics.posthogErrors30d === null
              ? "PostHog no configurado o sin acceso"
              : "Excepciones capturadas en PostHog"
          }
          icon={Bug}
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
              value={
                paygate.connected &&
                paygate.configured &&
                paygate.connectivityStatus === 'ok' ? (
                  <StatusPill label="Operativo" variant="success" />
                ) : paygate.connected && paygate.connectivityStatus === 'unauthorized' ? (
                  <StatusPill label="No autorizado" variant="danger" />
                ) : paygate.connected && paygate.configured ? (
                  <StatusPill label="Intermitente" variant="warning" />
                ) : paygate.connected ? (
                  <StatusPill label="No conectado" variant="danger" />
                ) : (
                  <StatusPill label="Pendiente" variant="warning" />
                )
              }
            />
          </div>
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
