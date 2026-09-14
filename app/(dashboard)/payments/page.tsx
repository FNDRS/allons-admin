import { DashboardList, DashboardPage } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import {
  listSubscriptionOrders,
  type PaymentOrderStatus,
  type SubscriptionOrder,
} from "@/lib/admin/subscriptionOrdersApi";
import { listAllUsers, type AdminUserRecord } from "@/lib/admin/users";
import { PaymentDetailButton } from "./_components/PaymentDetailButton";

export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<string, string> = {
  single_event: "Evento Único",
  basico: "Básico",
  pro: "Pro",
};

const STATUS_LABEL: Record<PaymentOrderStatus, string> = {
  pending_payment: "Pendiente",
  paid: "Pagado",
  failed: "Fallido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};
const STATUS_VARIANT: Record<
  PaymentOrderStatus,
  "success" | "warning" | "muted" | "danger"
> = {
  pending_payment: "warning",
  paid: "success",
  failed: "danger",
  cancelled: "muted",
  refunded: "muted",
};

function money(cents: number, currency = "HNL"): string {
  return `${currency === "HNL" ? "L. " : ""}${(cents / 100).toLocaleString(
    "es-HN",
    { maximumFractionDigits: 0 },
  )}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function loadProviders(): Promise<AdminUserRecord[]> {
  try {
    return (await listAllUsers()).filter((u) => u.role === "provider");
  } catch {
    return [];
  }
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status =
    params.status && params.status !== "all" ? params.status : undefined;

  // Parallelize: subscription orders + provider names (both hit different services).
  // Before: await orders → await providers (waterfall ~400ms + ~30ms). Now: ~max(orders, providers).
  const [ordersResult, providers] = await Promise.all([
    listSubscriptionOrders(status ? { status } : undefined)
      .then((d) => ({ data: d, error: null as string | null }))
      .catch((e) => ({
        data: null as Awaited<ReturnType<typeof listSubscriptionOrders>> | null,
        error: e instanceof Error ? e.message : "Error al cargar pagos",
      })),
    loadProviders(),
  ]);
  const data = ordersResult.data;
  const loadError = ordersResult.error;
  const nameByUserId = new Map(
    providers.map((p) => [p.id, p.brandName ?? p.fullName ?? p.email]),
  );

  const items = data?.items ?? [];
  const totals = data?.totals ?? {
    paidCents: 0,
    paidCount: 0,
    pendingCount: 0,
  };

  return (
    <DashboardPage>
      <PageHeader
        title="Pagos de suscripción"
        description={`${money(totals.paidCents)} cobrado · ${totals.pendingCount} pendientes`}
      />

      <div className="mb-5 shrink-0 border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-white/55">
        Solo lectura. El comercio paga su plan en la app (Paygate) y se activa
        solo. Estos registros son de control interno:{" "}
        <strong className="text-white/80">no son comprobante fiscal</strong>{" "}
        (CAI/SAR).
      </div>

      {/* KPIs */}
      <div className="mb-5 grid shrink-0 gap-4 sm:grid-cols-2">
        <div className="futuristic-panel p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Cobrado</p>
          <p className="mt-1 text-2xl font-bold text-green-400">
            {money(totals.paidCents)}
          </p>
          <p className="text-xs text-muted">{totals.paidCount} pagos</p>
        </div>
        <div className="futuristic-panel p-5">
          <p className="text-xs uppercase tracking-wide text-muted">
            Pendientes
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-300">
            {totals.pendingCount}
          </p>
          <p className="text-xs text-muted">pagos sin terminar</p>
        </div>
      </div>

      {/* Filter */}
      <form className="mb-4 flex shrink-0 items-center gap-2">
        <NativeSelect
          name="status"
          defaultValue={params.status ?? "all"}
          className="w-44"
        >
          <option value="all">Todos</option>
          <option value="paid">Pagados</option>
          <option value="pending_payment">Pendientes</option>
          <option value="failed">Fallidos</option>
          <option value="cancelled">Cancelados</option>
          <option value="refunded">Reembolsados</option>
        </NativeSelect>
        <Button type="submit" size="sm">
          Filtrar
        </Button>
      </form>

      {/* Table */}
      <DashboardList
        header={
          <div
            className="grid border-b border-white/12 bg-white/[0.02] px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted"
            style={{ gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.8fr 1fr 0.6fr" }}
          >
            <div>Comercio</div>
            <div>Plan</div>
            <div>Monto</div>
            <div>Estado</div>
            <div>Fecha</div>
            <div className="text-right" />
          </div>
        }
      >
        {loadError ? (
          <div className="px-4 py-12 text-center text-sm text-red-300">
            {loadError}
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted">
            Sin pagos todavía.
          </div>
        ) : (
          items.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              comercio={
                nameByUserId.get(order.userId) ?? order.userId.slice(0, 8)
              }
            />
          ))
        )}
      </DashboardList>
    </DashboardPage>
  );
}

function OrderRow({
  order,
  comercio,
}: {
  order: SubscriptionOrder;
  comercio: string;
}) {
  return (
    <div
      className="grid items-center border-b border-white/8 px-4 py-3 text-sm last:border-b-0 hover:bg-white/[0.02]"
      style={{ gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.8fr 1fr 0.6fr" }}
    >
      <div className="truncate font-semibold">{comercio}</div>
      <div className="text-xs text-muted">
        {PLAN_LABEL[order.planId] ?? order.planId}
        {order.periodEnd ? " · upgrade" : ""}
      </div>
      <div>{money(order.amountCents, order.currency)}</div>
      <div>
        <StatusPill
          label={STATUS_LABEL[order.status] ?? order.status}
          variant={STATUS_VARIANT[order.status] ?? "muted"}
        />
      </div>
      <div className="text-xs text-muted">{formatDate(order.createdAt)}</div>
      <div className="flex justify-end">
        <PaymentDetailButton order={order} comercio={comercio} />
      </div>
    </div>
  );
}
