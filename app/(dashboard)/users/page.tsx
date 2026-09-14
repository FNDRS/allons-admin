import { DashboardList, DashboardPage } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { setUserSuspended } from "@/lib/admin/actions";
import { listAllUsers, type AdminUserRecord } from "@/lib/admin/users";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: string;
}

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

function roleLabel(role: AdminUserRecord["role"]) {
  if (role === "provider") return "Proveedor";
  if (role === "staff") return "Staff";
  return "Cliente";
}

async function loadUsers(): Promise<AdminUserRecord[]> {
  try {
    const all = await listAllUsers();
    return all
      .filter((u) => u.role === "client")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    console.error("[users] failed", error);
    return [];
  }
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const all = await loadUsers();

  const q = (params.q ?? "").trim().toLowerCase();
  const statusFilter = params.status === "suspended" ? "suspended" : "all";

  const filtered = all.filter((u) => {
    if (statusFilter === "suspended" && u.status !== "suspended") return false;
    if (q) {
      const hay = `${u.email} ${u.fullName ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const activeCount = all.filter((u) => u.status === "active").length;
  const suspendedCount = all.length - activeCount;

  return (
    <DashboardPage>
      <PageHeader
        title="Usuarios"
        description={`${all.length.toLocaleString()} clientes registrados · ${suspendedCount} suspendidos`}
      />

      <form className="mb-4 flex shrink-0 flex-wrap items-center gap-2">
        <Input
          name="q"
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Buscar email o nombre"
          className="w-72 max-w-full"
        />
        <Select
          name="status"
          defaultValue={statusFilter}
          className="w-40"
        >
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="suspended">Suspendidos</SelectItem>
        </Select>
        <Button type="submit" size="sm">
          Filtrar
        </Button>
      </form>

      <DashboardList
        header={
          <div
            className="grid shrink-0 border-b border-white/12 bg-white/2 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted"
            style={{ gridTemplateColumns: "1.8fr 1fr 0.9fr 0.9fr" }}
          >
            <div>Cliente</div>
            <div>Estado</div>
            <div>Alta</div>
            <div className="text-right">Acciones</div>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted">
            {all.length === 0
              ? "No se pudieron cargar los usuarios. Verifica SUPABASE_SERVICE_ROLE_KEY."
              : "Sin coincidencias."}
          </div>
        ) : (
          filtered.map((u) => (
            <div
              key={u.id}
              className="grid items-center border-b border-white/8 px-4 py-3 text-sm last:border-b-0 hover:bg-white/2"
              style={{ gridTemplateColumns: "1.8fr 1fr 0.9fr 0.9fr" }}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">
                  {u.fullName ?? u.email.split("@")[0]}
                </div>
                <div className="truncate text-xs text-muted">{u.email}</div>
                <div className="mt-1 inline-flex border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/80">
                  {roleLabel(u.role)}
                </div>
              </div>
              <div>
                {u.status === "suspended" ? (
                  <StatusPill label="Suspendido" variant="danger" />
                ) : (
                  <StatusPill label="Activo" variant="success" />
                )}
              </div>
              <div className="text-xs text-muted">{formatDate(u.createdAt)}</div>
              <div className="flex justify-end">
                <form action={setUserSuspended}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input
                    type="hidden"
                    name="suspend"
                    value={u.status === "suspended" ? "false" : "true"}
                  />
                  <input type="hidden" name="revalidate" value="/users" />
                  <Button
                    type="submit"
                    size="sm"
                    variant={
                      u.status === "suspended" ? "success" : "destructive"
                    }
                  >
                    {u.status === "suspended" ? "Reactivar" : "Suspender"}
                  </Button>
                </form>
              </div>
            </div>
          ))
        )}
      </DashboardList>
    </DashboardPage>
  );
}
