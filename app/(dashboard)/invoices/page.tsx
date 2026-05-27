import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import {
  generateInvoiceAction,
  markInvoicePaidAction,
  voidInvoiceAction,
} from "@/lib/admin/invoiceActions";
import {
  listInvoices,
  type InvoiceStatus,
  type ProviderInvoice,
} from "@/lib/admin/invoicesApi";
import { listAllUsers, type AdminUserRecord } from "@/lib/admin/users";
import { InvoiceDetailButton } from "./_components/InvoiceDetailButton";

export const dynamic = "force-dynamic";

const PLAN_LABEL: Record<string, string> = {
  single_event: "Evento Único",
  basico: "Básico",
  pro: "Pro",
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  pending: "Pendiente",
  paid: "Pagada",
  void: "Anulada",
};
const STATUS_VARIANT: Record<
  InvoiceStatus,
  "success" | "warning" | "muted" | "danger"
> = {
  pending: "warning",
  paid: "success",
  void: "muted",
};

function money(cents: number, currency = "HNL"): string {
  return `${currency === "HNL" ? "L. " : ""}${(cents / 100).toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = params.status && params.status !== "all" ? params.status : undefined;

  let data: Awaited<ReturnType<typeof listInvoices>> | null = null;
  let loadError: string | null = null;
  try {
    data = await listInvoices(status ? { status } : undefined);
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Error al cargar facturas";
  }

  const providersResult = await loadProviders();
  const providers = providersResult.users.filter((p) => p.role === "provider");
  const providersLoadError = providersResult.error;
  const nameByUserId = new Map(
    providers.map((p) => [p.id, p.brandName ?? p.fullName ?? p.email]),
  );

  const items = data?.items ?? [];
  const totals = data?.totals ?? {
    paidCents: 0,
    pendingCents: 0,
    paidCount: 0,
    pendingCount: 0,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Contabilidad"
        title="Facturación"
        description={`${money(totals.paidCents)} cobrado · ${money(totals.pendingCents)} pendiente`}
      />

      <div className="mb-5 border border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-white/55">
        Cobro <strong className="text-white/80">manual</strong>: genera la
        factura, confirma el pago (transferencia/depósito) y marca pagada para
        activar el plan. Estos documentos son de control interno —{" "}
        <strong className="text-white/80">no son comprobante fiscal</strong>{" "}
        (CAI/SAR); el PDF y la numeración fiscal formal son un paso aparte.
      </div>

      {/* KPIs */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="futuristic-panel p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Cobrado</p>
          <p className="mt-1 text-2xl font-bold text-green-400">
            {money(totals.paidCents)}
          </p>
          <p className="text-xs text-muted">{totals.paidCount} facturas pagadas</p>
        </div>
        <div className="futuristic-panel p-5">
          <p className="text-xs uppercase tracking-wide text-muted">Pendiente</p>
          <p className="mt-1 text-2xl font-bold text-yellow-300">
            {money(totals.pendingCents)}
          </p>
          <p className="text-xs text-muted">
            {totals.pendingCount} facturas por cobrar
          </p>
        </div>
      </div>

      {/* Generate invoice */}
      <div className="futuristic-panel mb-5 p-5">
        <p className="eyebrow mb-3">Generar factura</p>
        {providersLoadError ? (
          <p className="mb-3 text-sm text-red-300">{providersLoadError}</p>
        ) : null}
        <form action={generateInvoiceAction} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-white/60">
            Comercio
            <select
              name="userId"
              required
              className="min-w-56 border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
            >
              <option value="">Selecciona…</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {(p.brandName ?? p.fullName ?? p.email) +
                    ` · ${PLAN_LABEL[p.subscriptionPlan ?? ""] ?? "prueba"}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/60">
            Plan
            <select
              name="planId"
              required
              className="border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white focus:border-white focus:outline-none"
            >
              <option value="single_event">Evento Único</option>
              <option value="basico">Básico</option>
              <option value="pro">Pro</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-white/60">
            Notas (opcional)
            <input
              name="notes"
              type="text"
              placeholder="Ref. transferencia…"
              className="min-w-48 border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-2 py-2 text-xs text-white/70">
            <input name="prorate" type="checkbox" className="accent-orange-500" />
            Prorratear (upgrade)
          </label>
          <button
            type="submit"
            className="bg-[#F67010] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#e06510]"
          >
            Generar
          </button>
        </form>
      </div>

      {/* Filter */}
      <form className="mb-4 flex items-center gap-2">
        <select
          name="status"
          defaultValue={params.status ?? "all"}
          className="border border-white/15 bg-white/[0.04] px-3 py-2 text-sm focus:border-white focus:outline-none"
        >
          <option value="all">Todas</option>
          <option value="pending">Pendientes</option>
          <option value="paid">Pagadas</option>
          <option value="void">Anuladas</option>
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
          style={{ gridTemplateColumns: "1.4fr 1.4fr 0.8fr 0.8fr 1.2fr 1.2fr" }}
        >
          <div>Factura</div>
          <div>Comercio</div>
          <div>Monto</div>
          <div>Estado</div>
          <div>Periodo</div>
          <div className="text-right">Acciones</div>
        </div>

        {loadError ? (
          <div className="px-4 py-12 text-center text-sm text-red-300">
            {loadError}
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted">
            Aún no hay facturas. Genera una arriba.
          </div>
        ) : (
          items.map((inv) => (
            <InvoiceRow
              key={inv.id}
              inv={inv}
              comercio={nameByUserId.get(inv.userId) ?? inv.userId.slice(0, 8)}
            />
          ))
        )}
      </div>
    </div>
  );
}

async function loadProviders(): Promise<{
  users: AdminUserRecord[];
  error: string | null;
}> {
  try {
    return { users: await listAllUsers(), error: null };
  } catch (e) {
    console.error("[invoices] failed to load providers", e);
    return {
      users: [],
      error:
        e instanceof Error
          ? e.message
          : "No se pudieron cargar los comercios para generar facturas",
    };
  }
}

function InvoiceRow({
  inv,
  comercio,
}: {
  inv: ProviderInvoice;
  comercio: string;
}) {
  return (
    <div
      className="grid items-center border-b border-white/8 px-4 py-3 text-sm last:border-b-0 hover:bg-white/[0.02]"
      style={{ gridTemplateColumns: "1.4fr 1.4fr 0.8fr 0.8fr 1.2fr 1.2fr" }}
    >
      <div className="min-w-0">
        <div className="truncate font-semibold">{inv.invoiceNumber}</div>
        <div className="truncate text-xs text-muted">
          {PLAN_LABEL[inv.planId] ?? inv.planId}
          {inv.prorated ? " · prorrateada" : ""}
        </div>
      </div>
      <div className="truncate">{comercio}</div>
      <div>{money(inv.amountCents, inv.currency)}</div>
      <div>
        <StatusPill
          label={STATUS_LABEL[inv.status]}
          variant={STATUS_VARIANT[inv.status]}
        />
      </div>
      <div className="text-xs text-muted">
        {formatDate(inv.periodStart)} → {formatDate(inv.periodEnd)}
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        <InvoiceDetailButton invoice={inv} comercio={comercio} />
        {inv.status === "pending" ? (
          <>
            <form action={markInvoicePaidAction}>
              <input type="hidden" name="invoiceId" value={inv.id} />
              <button
                type="submit"
                className="border border-success/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-success transition hover:bg-success/10"
              >
                Marcar pagada
              </button>
            </form>
            <form action={voidInvoiceAction}>
              <input type="hidden" name="invoiceId" value={inv.id} />
              <button
                type="submit"
                className="border border-white/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-muted transition hover:bg-white/5"
              >
                Anular
              </button>
            </form>
          </>
        ) : inv.status === "paid" ? (
          <span className="text-[10px] text-muted">
            Pagada {formatDate(inv.paidAt)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
