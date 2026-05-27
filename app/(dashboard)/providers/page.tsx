import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import {
  resendInviteAction,
  setProviderPlanAction,
  setProviderStatusAction,
} from "@/lib/admin/actions";
import {
  listAllUsers,
  type AdminUserRecord,
  type ProviderStatus,
} from "@/lib/admin/users";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: string;
  created?: string;
  invite?: "invited" | "existing";
  resent?: "ok" | "failed" | "already_confirmed" | "missing_email";
  email?: string;
  reason?: string;
}

const STATUS_LABEL: Record<ProviderStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  paused: "Pausado",
  suspended: "Suspendido",
};

const STATUS_VARIANT: Record<ProviderStatus, "success" | "warning" | "muted" | "danger"> = {
  pending: "warning",
  approved: "success",
  paused: "muted",
  suspended: "danger",
};

const PLAN_OPTIONS: { value: string; label: string }[] = [
  { value: "pendiente", label: "Prueba (sin plan)" },
  { value: "single_event", label: "Evento Único" },
  { value: "basico", label: "Básico" },
  { value: "pro", label: "Pro" },
];
const PLAN_LABEL: Record<string, string> = Object.fromEntries(
  PLAN_OPTIONS.map((o) => [o.value, o.label]),
);

function subscriptionSummary(p: AdminUserRecord): string {
  const planLabel = PLAN_LABEL[p.subscriptionPlan ?? "pendiente"] ?? "Prueba";
  const isPlan =
    p.subscriptionPlan === "single_event" ||
    p.subscriptionPlan === "basico" ||
    p.subscriptionPlan === "pro";
  if (isPlan && p.subscriptionPeriodEnd) {
    return `${planLabel} · renueva ${formatDate(p.subscriptionPeriodEnd)}`;
  }
  if (p.freeTrialEnd) {
    const ended = new Date(p.freeTrialEnd).getTime() < Date.now();
    return ended
      ? `${planLabel} · prueba vencida (${formatDate(p.freeTrialEnd)})`
      : `${planLabel} · prueba hasta ${formatDate(p.freeTrialEnd)}`;
  }
  return planLabel;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
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
    const all = await listAllUsers();
    return all
      .filter((u) => u.role === "provider")
      .sort((a, b) => {
        const order: ProviderStatus[] = ["pending", "approved", "paused", "suspended"];
        const ai = order.indexOf(a.providerStatus ?? "pending");
        const bi = order.indexOf(b.providerStatus ?? "pending");
        if (ai !== bi) return ai - bi;
        return b.createdAt.localeCompare(a.createdAt);
      });
  } catch (error) {
    console.error("[providers] failed", error);
    return [];
  }
}

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const all = await loadProviders();

  const q = (params.q ?? "").trim().toLowerCase();
  const statusFilter = (params.status as ProviderStatus | "all") ?? "all";

  const filtered = all.filter((p) => {
    if (statusFilter !== "all" && p.providerStatus !== statusFilter) return false;
    if (q) {
      const hay = `${p.email} ${p.fullName ?? ""} ${p.brandName ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    total: all.length,
    pending: all.filter((p) => p.providerStatus === "pending").length,
    approved: all.filter((p) => p.providerStatus === "approved").length,
    paused: all.filter((p) => p.providerStatus === "paused").length,
    suspended: all.filter((p) => p.providerStatus === "suspended").length,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Comercios"
        title="Proveedores"
        description={`${counts.total} cuentas · ${counts.pending} esperando aprobación · ${counts.approved} activas · ${counts.suspended} suspendidas`}
        action={
          <a
            href="/providers/create"
            className="inline-flex items-center gap-1.5 bg-[#F67010] px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#e06510]"
          >
            + Nuevo Comercio
          </a>
        }
      />

      {params.created ? (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          ✓ Comercio <strong>{params.created}</strong> creado correctamente. Apruébalo
          cuando el equipo haya verificado los datos.
          {params.invite === "invited" ? (
            <div className="mt-1 text-xs text-green-300/80">
              Supabase envió un enlace de invitación al correo del comercio.
            </div>
          ) : params.invite === "existing" ? (
            <div className="mt-1 text-xs text-yellow-300/80">
              ⚠ Ya existía una cuenta con ese correo — se actualizaron los metadatos pero no se envió invitación.
            </div>
          ) : null}
        </div>
      ) : null}

      {params.resent === "ok" ? (
        <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          ✓ Invitación reenviada a <strong>{params.email}</strong>.
        </div>
      ) : params.resent === "already_confirmed" ? (
        <div className="mb-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          El usuario ya aceptó la invitación previa — no se reenvió. Si perdió el acceso, usa el flujo de recuperación de contraseña.
        </div>
      ) : params.resent === "failed" ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          ⚠ No se pudo reenviar la invitación{params.reason ? `: ${params.reason}` : "."}
        </div>
      ) : params.resent === "missing_email" ? (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          ⚠ El usuario no tiene correo registrado.
        </div>
      ) : null}

      <form className="mb-4 flex flex-wrap items-center gap-2">
        <input
          name="q"
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Buscar comercio, email o handle"
          className="w-80 max-w-full border border-white/15 bg-white/[0.04] px-3 py-2 text-sm focus:border-white focus:outline-none"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="border border-white/15 bg-white/[0.04] px-3 py-2 text-sm focus:border-white focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="paused">Pausado</option>
          <option value="suspended">Suspendido</option>
        </select>
        <button
          type="submit"
          className="border border-white/30 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-black hover:bg-white/90"
        >
          Filtrar
        </button>
      </form>

      <div className="futuristic-panel overflow-hidden">
        <div
          className="grid border-b border-white/12 bg-white/[0.02] px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted"
          style={{ gridTemplateColumns: "1.8fr 1fr 0.9fr 1.6fr" }}
        >
          <div>Proveedor</div>
          <div>Estado</div>
          <div>Alta</div>
          <div className="text-right">Acciones</div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted">
            {all.length === 0
              ? "No se pudieron cargar los proveedores. Verifica SUPABASE_SERVICE_ROLE_KEY."
              : "Sin coincidencias."}
          </div>
        ) : (
          filtered.map((p) => {
            const status = p.providerStatus ?? "pending";
            return (
              <div
                key={p.id}
                className="grid items-center border-b border-white/8 px-4 py-3 text-sm last:border-b-0 hover:bg-white/[0.02]"
                style={{ gridTemplateColumns: "1.8fr 1fr 0.9fr 1.6fr" }}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">
                    {p.brandName ?? p.fullName ?? p.email.split("@")[0]}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {p.brandHandle ? `${p.brandHandle} · ` : ""}{p.email}
                  </div>
                  <div className="truncate text-[11px] text-white/45">
                    {subscriptionSummary(p)}
                  </div>
                </div>
                <div>
                  <StatusPill
                    label={STATUS_LABEL[status]}
                    variant={STATUS_VARIANT[status]}
                  />
                </div>
                <div className="text-xs text-muted">
                  {formatDate(p.createdAt)}
                </div>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {p.emailConfirmedAt === null ? (
                    <ResendInviteButton userId={p.id} />
                  ) : null}
                  {status !== "approved" ? (
                    <ActionButton
                      userId={p.id}
                      status="approved"
                      label="Aprobar"
                      tone="success"
                    />
                  ) : null}
                  {status !== "paused" && status !== "pending" ? (
                    <ActionButton
                      userId={p.id}
                      status="paused"
                      label="Pausar"
                      tone="muted"
                    />
                  ) : null}
                  {status !== "suspended" ? (
                    <ActionButton
                      userId={p.id}
                      status="suspended"
                      label="Suspender"
                      tone="danger"
                    />
                  ) : (
                    <ActionButton
                      userId={p.id}
                      status="approved"
                      label="Reactivar"
                      tone="success"
                    />
                  )}
                  <PlanControl
                    userId={p.id}
                    currentPlan={p.subscriptionPlan ?? "pendiente"}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ActionButton({
  userId,
  status,
  label,
  tone,
}: {
  userId: string;
  status: ProviderStatus;
  label: string;
  tone: "success" | "danger" | "muted";
}) {
  const styles =
    tone === "success"
      ? "border-success/40 text-success hover:bg-success/10"
      : tone === "danger"
      ? "border-danger/40 text-danger hover:bg-danger/10"
      : "border-white/15 text-muted hover:bg-white/5";
  return (
    <form action={setProviderStatusAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="revalidate" value="/providers" />
      <button
        type="submit"
        className={`border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${styles}`}
      >
        {label}
      </button>
    </form>
  );
}

function PlanControl({
  userId,
  currentPlan,
}: {
  userId: string;
  currentPlan: string;
}) {
  return (
    <form action={setProviderPlanAction} className="flex items-center gap-1">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="revalidate" value="/providers" />
      <select
        name="plan"
        defaultValue={currentPlan}
        className="border border-white/15 bg-white/[0.04] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide focus:border-white focus:outline-none"
      >
        {PLAN_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        title="Asignar plan al comercio"
        className="border border-[#F67010]/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#F67010] transition hover:bg-[#F67010]/10"
      >
        Plan
      </button>
    </form>
  );
}

function ResendInviteButton({ userId }: { userId: string }) {
  return (
    <form action={resendInviteAction}>
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        title="Reenviar enlace de invitación por correo"
        className="border border-[#3A86FF]/40 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#3A86FF] transition hover:bg-[#3A86FF]/10"
      >
        ↻ Reenviar invitación
      </button>
    </form>
  );
}
