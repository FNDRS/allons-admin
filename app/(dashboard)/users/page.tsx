import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { setUserSuspended } from "@/lib/admin/actions";
import { listAllUsers, type AdminUserRecord } from "@/lib/admin/users";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: string;
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
    <div>
      <PageHeader
        eyebrow="Cuentas"
        title="Usuarios"
        description={`${all.length.toLocaleString()} clientes registrados · ${suspendedCount} suspendidos`}
      />

      <form className="mb-4 flex flex-wrap items-center gap-2">
        <input
          name="q"
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Buscar email o nombre"
          className="w-72 max-w-full border border-white/15 bg-white/4 px-3 py-2 text-sm focus:border-white focus:outline-none"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="border border-white/15 bg-white/4 px-3 py-2 text-sm focus:border-white focus:outline-none"
        >
          <option value="all">Todos</option>
          <option value="suspended">Suspendidos</option>
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
          className="grid border-b border-white/12 bg-white/2 px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted"
          style={{ gridTemplateColumns: "1.8fr 1fr 0.9fr 0.9fr" }}
        >
          <div>Cliente</div>
          <div>Estado</div>
          <div>Alta</div>
          <div className="text-right">Acciones</div>
        </div>

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
                  <button
                    type="submit"
                    className={`border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                      u.status === "suspended"
                        ? "border-success/40 text-success hover:bg-success/10"
                        : "border-danger/40 text-danger hover:bg-danger/10"
                    }`}
                  >
                    {u.status === "suspended" ? "Reactivar" : "Suspender"}
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
