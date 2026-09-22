import { DashboardList, DashboardPage } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { ProviderStatusActions } from "@/app/(dashboard)/providers/_components/ProviderStatusActions";
import {
  listAllUsers,
  type AdminUserRecord,
  type ProviderStatus,
} from "@/lib/admin/users";
import Link from "next/link";

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


function formatDate(iso: string | null) {
  if (!iso) return "-";
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
    <DashboardPage>
      <PageHeader
        title="Proveedores"
        description={`${counts.total} cuentas · ${counts.pending} esperando aprobación · ${counts.approved} activas · ${counts.suspended} suspendidas`}
        action={
          <Button asChild variant="brand" size="sm">
            <a href="/providers/create">+ Nuevo Comercio</a>
          </Button>
        }
      />

      {params.created ? (
        <div className="mb-4 shrink-0 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          Comercio <strong>{params.created}</strong> creado. Apruébalo cuando
          hayas revisado los datos.
          {params.invite === "invited" ? (
            <div className="mt-1 text-xs text-green-300/80">
              Se mandó un enlace de invitación al correo del comercio.
            </div>
          ) : params.invite === "existing" ? (
            <div className="mt-1 text-xs text-yellow-300/80">
              Ya había una cuenta con ese correo. Se actualizaron los metadatos y no se mandó invitación.
            </div>
          ) : null}
        </div>
      ) : null}

      {params.resent === "ok" ? (
        <div className="mb-4 shrink-0 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          Invitación reenviada a <strong>{params.email}</strong>.
        </div>
      ) : params.resent === "already_confirmed" ? (
        <div className="mb-4 shrink-0 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          Ya aceptó la invitación anterior, así que no se reenvió. Si perdió el acceso, usa recuperar contraseña.
        </div>
      ) : params.resent === "failed" ? (
        <div className="mb-4 shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          No se pudo reenviar la invitación{params.reason ? `: ${params.reason}` : "."}
        </div>
      ) : params.resent === "missing_email" ? (
        <div className="mb-4 shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          El usuario no tiene correo registrado.
        </div>
      ) : null}

      <form className="mb-4 flex shrink-0 flex-wrap items-center gap-2">
        <Input
          name="q"
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Buscar comercio, email o handle"
          className="w-80 max-w-full"
        />
        <Select name="status" defaultValue={statusFilter} className="w-44">
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="pending">Pendiente</SelectItem>
          <SelectItem value="approved">Aprobado</SelectItem>
          <SelectItem value="paused">Pausado</SelectItem>
          <SelectItem value="suspended">Suspendido</SelectItem>
        </Select>
        <Button type="submit" size="sm">
          Filtrar
        </Button>
      </form>

      <DashboardList
        header={
          <div
            className="grid border-b border-white/12 bg-white/2 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted"
            style={{ gridTemplateColumns: "1.8fr 1fr 0.9fr 1.4fr" }}
          >
            <div>Proveedor</div>
            <div>Estado</div>
            <div>Alta</div>
            <div className="text-right">Acciones</div>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted">
            {all.length === 0
              ? "No se pudieron cargar los proveedores. Revisa ADMIN_API_BASE_URL y ADMIN_API_SECRET."
              : "Sin coincidencias."}
          </div>
        ) : (
          filtered.map((p) => {
            const status = p.providerStatus ?? "pending";
            return (
              <div
                key={p.id}
                className="grid items-center border-b border-white/8 px-4 py-3 text-sm last:border-b-0 hover:bg-white/2"
                style={{ gridTemplateColumns: "1.8fr 1fr 0.9fr 1.4fr" }}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">
                    {p.brandName ?? p.fullName ?? p.email.split("@")[0]}
                  </div>
                  <div className="truncate text-xs text-muted">
                    {p.brandHandle ? `${p.brandHandle} · ` : ""}{p.email}
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
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/providers/${p.id}` as never}>Ver</Link>
                  </Button>
                  <ProviderStatusActions
                    userId={p.id}
                    status={status}
                    emailConfirmedAt={p.emailConfirmedAt}
                    revalidatePath="/providers"
                  />
                </div>
              </div>
            );
          })
        )}
      </DashboardList>
    </DashboardPage>
  );
}
