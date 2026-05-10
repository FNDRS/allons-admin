import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { setEventStatus } from "@/lib/admin/eventActions";
import {
  listAdminEvents,
  type AdminEventListItem,
  type AdminEventListResponse,
} from "@/lib/admin/eventsApi";
import { Calendar, Plug, Ticket, Users } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: string;
  city?: string;
  providerId?: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  published: "Publicado",
  sold_out: "Agotado",
  ended: "Finalizado",
  suspended: "Suspendido",
};

const STATUS_VARIANT: Record<
  string,
  "success" | "warning" | "muted" | "danger" | "info"
> = {
  draft: "muted",
  published: "success",
  sold_out: "warning",
  ended: "muted",
  suspended: "danger",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface LoadResult {
  data: AdminEventListResponse | null;
  error: string | null;
}

async function loadEvents(filters: SearchParams): Promise<LoadResult> {
  try {
    const data = await listAdminEvents({
      q: filters.q,
      status: filters.status,
      city: filters.city,
      providerId: filters.providerId,
      limit: 200,
    });
    return { data, error: null };
  } catch (error) {
    console.error("[events] failed", error);
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los eventos.",
    };
  }
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { data, error } = await loadEvents(params);
  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const summary = items.reduce(
    (acc, ev) => {
      if (ev.status === "published") acc.published += 1;
      if (ev.status === "sold_out") acc.soldOut += 1;
      if (ev.status === "draft") acc.draft += 1;
      acc.capacity += ev.capacity;
      return acc;
    },
    { published: 0, soldOut: 0, draft: 0, capacity: 0 },
  );

  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Eventos"
        description={
          error
            ? "No se pudieron cargar los eventos."
            : `${total.toLocaleString()} eventos totales · ${summary.published} publicados · ${summary.soldOut} agotados`
        }
      />

      {error ? (
        <ConnectionWarning message={error} />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Eventos visibles"
              value={items.length.toLocaleString()}
              hint={`${total.toLocaleString()} totales`}
              icon={Calendar}
            />
            <KpiCard
              label="Publicados"
              value={summary.published.toLocaleString()}
              hint="En el feed del cliente"
              icon={Calendar}
            />
            <KpiCard
              label="Agotados"
              value={summary.soldOut.toLocaleString()}
              hint="Con tickets vendidos"
              icon={Ticket}
            />
            <KpiCard
              label="Capacidad combinada"
              value={summary.capacity.toLocaleString()}
              hint="Suma de aforo"
              icon={Users}
            />
          </section>

          <form className="mt-6 mb-4 flex flex-wrap items-center gap-2">
            <input
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Buscar por título"
              className="w-72 max-w-full border border-white/15 bg-white/[0.04] px-3 py-2 text-sm focus:border-white focus:outline-none"
            />
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="border border-white/15 bg-white/[0.04] px-3 py-2 text-sm focus:border-white focus:outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="draft">Borrador</option>
              <option value="published">Publicado</option>
              <option value="sold_out">Agotado</option>
              <option value="ended">Finalizado</option>
              <option value="suspended">Suspendido</option>
            </select>
            <input
              name="city"
              defaultValue={params.city ?? ""}
              placeholder="Ciudad"
              className="w-40 border border-white/15 bg-white/[0.04] px-3 py-2 text-sm focus:border-white focus:outline-none"
            />
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
              style={{
                gridTemplateColumns: "2fr 1.4fr 1fr 1fr 1.4fr",
              }}
            >
              <div>Evento</div>
              <div>Proveedor</div>
              <div>Estado</div>
              <div>Inicio</div>
              <div className="text-right">Acciones</div>
            </div>

            {items.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted">
                Sin coincidencias.
              </div>
            ) : (
              items.map((ev) => <EventRow key={ev.id} event={ev} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EventRow({ event }: { event: AdminEventListItem }) {
  const status = event.status ?? "draft";
  const variant = STATUS_VARIANT[status] ?? "muted";
  const label = STATUS_LABEL[status] ?? status;

  return (
    <div
      className="grid items-center border-b border-white/8 px-4 py-3 text-sm last:border-b-0 hover:bg-white/[0.02]"
      style={{ gridTemplateColumns: "2fr 1.4fr 1fr 1fr 1.4fr" }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {event.themeColor ? (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: event.themeColor }}
            />
          ) : null}
          <div className="truncate font-semibold">{event.title}</div>
        </div>
        <div className="truncate text-xs text-muted">
          {event.eventType === "recurring_class" ? "Clase recurrente · " : ""}
          {event.city ?? "Sin ciudad"}
          {event.venue ? ` · ${event.venue}` : ""}
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm">
          {event.provider?.name ?? "—"}
        </div>
        {event.provider?.handle ? (
          <div className="truncate text-xs text-muted">
            {event.provider.handle}
          </div>
        ) : null}
      </div>
      <div>
        <StatusPill label={label} variant={variant} />
      </div>
      <div className="text-xs text-muted">{formatDate(event.startsAt)}</div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {status !== "published" ? (
          <ActionButton
            eventId={event.id}
            status="published"
            label="Publicar"
            tone="success"
          />
        ) : null}
        {status !== "suspended" ? (
          <ActionButton
            eventId={event.id}
            status="suspended"
            label="Suspender"
            tone="danger"
          />
        ) : (
          <ActionButton
            eventId={event.id}
            status="published"
            label="Reactivar"
            tone="success"
          />
        )}
        {status !== "ended" ? (
          <ActionButton
            eventId={event.id}
            status="ended"
            label="Finalizar"
            tone="muted"
          />
        ) : null}
      </div>
    </div>
  );
}

function ActionButton({
  eventId,
  status,
  label,
  tone,
}: {
  eventId: string;
  status: string;
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
    <form action={setEventStatus}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${styles}`}
      >
        {label}
      </button>
    </form>
  );
}

function ConnectionWarning({ message }: { message: string }) {
  return (
    <section className="futuristic-panel flex flex-col items-center gap-4 p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center border border-white/15">
        <Plug size={20} />
      </div>
      <div>
        <h2 className="text-lg font-bold uppercase tracking-tight">
          No se pudo conectar al admin API
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted">{message}</p>
      </div>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-left text-xs text-muted">
        <li>
          Define <code className="text-white">ADMIN_API_BASE_URL</code> apuntando a
          tu deploy de <code className="text-white">allons-api</code>.
        </li>
        <li>
          Define <code className="text-white">ADMIN_API_SECRET</code> con el mismo
          valor en <code className="text-white">allons-api</code> y en este admin.
        </li>
        <li>Reinicia el servidor (o redeploya en Vercel) tras configurar.</li>
      </ol>
    </section>
  );
}
