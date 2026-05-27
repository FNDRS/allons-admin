import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
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
  if (Number.isNaN(d.getTime())) return "—";
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

  let data: Awaited<ReturnType<typeof listSubscriptionOrders>> | null = null;
  let loadError: string | null = null;
  try {
    data = await listSubscriptionOrders(status ? { status } : undefined);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Error al cargar pagos";
  }

  const providers = await loadProviders();
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
    <div>
      <PageHeader
        eyebrow="Contabilidad"
        title="Pagos de suscripción"
        description={`${money(totals.paidCents)} cobrado · ${totals.pendingCount} pendientes`}
      />

      <div className="mb-5 border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-white/55">
        Vista de solo lectura. El cobro es{" "}
        <strong className="text-white/80">self-serve</strong>: el comercio paga
        su plan en la app vía Paygate (tarjeta validada) y se activa solo. Estos
        registros son de control interno —{" "}
        <strong className="text-white/80">no son comprobante fiscal</strong>{" "}
        (CAI/SAR).
      </div>

      {/* KPIs */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
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
          <p className="text-xs text-muted">checkouts sin completar</p>
        </div>
      </div>

      {/* Filter */}
      <form className="mb-4 flex items-center gap-2">
        <select
          name="status"
          defaultValue={params.status ?? "all"}
          className="border border-white/15 bg-white/[0.04] px-3 py-2 text-sm focus:border-white focus:outline-none"
        >
          <option value="all">Todos</option>
          <option value="paid">Pagados</option>
          <option value="pending_payment">Pendientes</option>
          <option value="failed">Fallidos</option>
          <option value="cancelled">Cancelados</option>
          <option value="refunded">Reembolsados</option>
        </select>
        <button
          type="submit"
          className="border border-white/30 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-black hover:bg-white/90"
        >
          Filtrar
        </button>
      </form>

      {/* Table */}
      <div className="futuristic-panel overflow-hidden">
        <div
          className="grid border-b border-white/12 bg-white/[0.02] px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted"
          style={{ gridTemplateColumns: "1.6fr 0.8fr 0.8fr 0.8fr 1fr 0.6fr" }}
        >
          <div>Comercio</div>
          <div>Plan</div>
          <div>Monto</div>
          <div>Estado</div>
          <div>Fecha</div>
          <div className="text-right">—</div>
        </div>

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
      </div>
    </div>
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
