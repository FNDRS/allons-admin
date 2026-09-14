import { DashboardPage, DashboardScroll } from "@/components/DashboardPage";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import {
  getAdminOverviewMetricsCached,
  getAdminPlatformStatusCached,
} from "@/lib/admin/eventsApi";
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
import { Suspense } from "react";

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
    const status = await getAdminPlatformStatusCached();
    return {
      connected: true,
      configured: Boolean(status.paygate?.configured),
      connectivityStatus: String(status.paygate?.connectivityStatus ?? 'unknown'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[overview] paygate status unavailable: ${message}`);
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
    const metrics = await getAdminOverviewMetricsCached();
    return {
      activeEvents: metrics.activeEvents ?? 0,
      totalEvents: metrics.totalEvents ?? metrics.activeEvents ?? 0,
      tickets30d: metrics.tickets30d ?? 0,
      posthogErrors30d: metrics.posthogErrors30d ?? null,
      gmv30d: metrics.gmv30d ?? null,
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

export default function OverviewPage() {
  return (
    <DashboardPage>
      <PageHeader title="Resumen" />

      <DashboardScroll>
      <Suspense fallback={<CountsSkeleton />}>
        <CountsSection />
      </Suspense>

      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsSection />
      </Suspense>
      </DashboardScroll>
    </DashboardPage>
  );
}

async function CountsSection() {
  const counts = await loadCounts();
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Clientes"
        value={counts.clients.toLocaleString()}
        hint="Cuentas de cliente"
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
        hint="Cuentas de staff"
        icon={Activity}
      />
      <KpiCard
        label="Altas 24 h"
        value={counts.signupsLast24h.toLocaleString()}
        hint="Altas de las últimas 24 h"
        icon={Users}
      />
    </section>
  );
}

async function MetricsSection() {
  const [metrics, paygate] = await Promise.all([
    loadOverviewMetrics(),
    loadPaygateStatus(),
  ]);
  return (
    <>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Eventos activos"
          value={(metrics.activeEvents ?? 0).toLocaleString()}
          hint={
            metrics.connected
              ? (metrics.totalEvents ?? 0) > (metrics.activeEvents ?? 0)
                ? `${(metrics.totalEvents ?? 0).toLocaleString()} en total, con borradores y vencidos`
                : "Publicados y vigentes"
              : "Sin conexión a la API"
          }
          icon={Calendar}
        />
        <KpiCard
          label="Tickets 30 d"
          value={(metrics.tickets30d ?? 0).toLocaleString()}
          hint={metrics.connected ? "Últimos 30 días" : "Sin conexión"}
          icon={Ticket}
        />
        <KpiCard
          label="GMV 30 d"
          value={
            metrics.gmv30d == null ? "-" : formatCurrency(metrics.gmv30d)
          }
          hint={
            metrics.gmv30d == null ? "Sin dato de pasarela" : "Ventas brutas"
          }
          icon={CircleDollarSign}
        />
        <KpiCard
          label="Errores 30 d"
          value={
            metrics.posthogErrors30d == null
              ? "-"
              : metrics.posthogErrors30d.toLocaleString()
          }
          hint={
            metrics.posthogErrors30d == null
              ? "PostHog no está conectado"
              : "Errores en PostHog"
          }
          icon={Bug}
        />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="futuristic-panel p-6">
          <div className="eyebrow mb-4">Servicios</div>
          <div className="space-y-3 text-sm">
            <Row
              label="Auth (Supabase)"
              value={<StatusPill label="OK" variant="success" />}
            />
            <Row
              label="Edge function · invite-staff"
              value={<StatusPill label="OK" variant="success" />}
            />
            <Row
              label="Métricas de eventos"
              value={
                <StatusPill
                  label={metrics.connected ? "OK" : "Pendiente"}
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
                  <StatusPill label="OK" variant="success" />
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
    </>
  );
}

function CountsSkeleton() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="futuristic-panel p-4 animate-pulse">
          <div className="h-3 w-20 bg-white/10 mb-3" />
          <div className="h-6 w-12 bg-white/10" />
          <div className="h-3 w-24 bg-white/5 mt-2" />
        </div>
      ))}
    </section>
  );
}

function MetricsSkeleton() {
  return (
    <>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="futuristic-panel p-4 animate-pulse">
            <div className="h-3 w-20 bg-white/10 mb-3" />
            <div className="h-6 w-12 bg-white/10" />
          </div>
        ))}
      </section>
      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="futuristic-panel p-6 animate-pulse">
          <div className="h-4 w-32 bg-white/10 mb-4" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-white/5" />
            <div className="h-4 w-full bg-white/5" />
          </div>
        </div>
      </section>
    </>
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
