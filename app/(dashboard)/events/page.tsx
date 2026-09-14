import { DashboardList, DashboardPage, DashboardScroll } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import {
  listAdminEvents,
  type AdminEventListItem,
  type AdminEventListResponse,
} from "@/lib/admin/eventsApi";
import { EventStatusActions } from "@/app/(dashboard)/events/_components/EventStatusActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectItem } from "@/components/ui/select";
import { Plug } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface SearchParams {
  q?: string;
  status?: string;
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
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    // Sin el año, un evento del año pasado se lee igual que uno de este mes.
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Un evento terminó cuando pasó su fin — o su inicio, si no tiene fin.
 *
 * La app sólo lista eventos futuros, así que sin esta marca un evento se ve
 * "Publicado" en el panel y en la app no aparece por ningún lado.
 */
function hasEnded(event: { startsAt: string | null; endsAt: string | null }) {
  const reference = event.endsAt ?? event.startsAt;
  if (!reference) return false;
  const date = new Date(reference);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

/** "hace 11 días" / "en 3 días": ubica el evento sin leer la fecha. */
function formatRelative(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffDays = Math.round((date.getTime() - Date.now()) / 86_400_000);
  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "mañana";
  if (diffDays === -1) return "ayer";
  if (diffDays > 0) return `en ${diffDays} días`;
  const past = Math.abs(diffDays);
  if (past < 30) return `hace ${past} días`;
  const months = Math.round(past / 30);
  return months === 1 ? "hace 1 mes" : `hace ${months} meses`;
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
      if (hasEnded(ev)) acc.ended += 1;
      return acc;
    },
    { published: 0, soldOut: 0, ended: 0 },
  );

  return (
    <DashboardPage>
      <PageHeader
        title="Eventos"
        description={
          error
            ? "No se pudieron cargar los eventos."
            : `${total.toLocaleString()} eventos totales · ${summary.published} publicados · ${summary.soldOut} agotados · ${summary.ended} finalizados`
        }
        action={
          <Button asChild size="sm">
            <Link href="/events/create">+ Nuevo evento</Link>
          </Button>
        }
      />

      {error ? (
        <DashboardScroll>
          <ConnectionWarning message={error} />
        </DashboardScroll>
      ) : (
        <>
          <form className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
            <Input
              name="q"
              type="search"
              defaultValue={params.q ?? ""}
              placeholder="Buscar por título"
              className="w-72 max-w-full"
            />
            <Select
              name="status"
              defaultValue={params.status ?? ""}
              className="w-44"
            >
              <SelectItem value="">Todos los estados</SelectItem>
              <SelectItem value="draft">Borrador</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
              <SelectItem value="sold_out">Agotado</SelectItem>
              <SelectItem value="ended">Finalizado</SelectItem>
              <SelectItem value="suspended">Suspendido</SelectItem>
            </Select>
            <Button type="submit" size="sm">
              Filtrar
            </Button>
          </form>

          <DashboardList
            header={
              <div
                className="grid items-center gap-x-6 border-b border-white/12 bg-white/[0.02] px-5 py-3.5 text-[10px] font-bold uppercase tracking-wide text-muted"
                style={{
                  gridTemplateColumns:
                    "minmax(0,2fr) minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.4fr)",
                }}
              >
                <div>Evento</div>
                <div>Proveedor</div>
                <div>Estado</div>
                <div>Inicio</div>
                <div className="text-right">Acciones</div>
              </div>
            }
          >
            {items.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-muted">
                Sin coincidencias.
              </div>
            ) : (
              items.map((ev) => <EventRow key={ev.id} event={ev} />)
            )}
          </DashboardList>
        </>
      )}
    </DashboardPage>
  );
}

function EventRow({ event }: { event: AdminEventListItem }) {
  const status = event.status ?? "draft";
  const variant = STATUS_VARIANT[status] ?? "muted";
  const label = STATUS_LABEL[status] ?? status;
  const ended = hasEnded(event);

  return (
    <div
      className={`group relative grid min-w-0 items-center gap-x-6 border-b border-white/8 px-5 py-5 text-sm last:border-b-0 transition-colors duration-150 ease-out hover:bg-white/5 ${
        ended ? "opacity-60 hover:opacity-100" : ""
      }`}
      style={{
        gridTemplateColumns:
          "minmax(0,2fr) minmax(0,1.4fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.4fr)",
      }}
    >
      <Link
        href={`/events/${event.id}` as never}
        className="absolute inset-0 z-0"
        aria-label={`Ver ${event.title}`}
      />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {event.themeColor ? (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: event.themeColor }}
            />
          ) : null}
          <div className="truncate font-semibold transition-colors duration-150 group-hover:text-white">
            {event.title}
          </div>
        </div>
        <div className="truncate text-xs text-muted">
          {event.eventType === "recurring_class" ? "Clase recurrente · " : ""}
          {event.city ?? "Sin ciudad"}
          {event.venue ? ` · ${event.venue}` : ""}
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm">
          {event.provider?.name ?? "-"}
        </div>
        {event.provider?.handle ? (
          <div className="truncate text-xs text-muted">
            {event.provider.handle}
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <StatusPill label={label} variant={variant} />
        {ended ? <StatusPill label="Finalizado" variant="muted" /> : null}
      </div>
      <div className="min-w-0 text-xs">
        <div className={ended ? "text-muted line-through" : "text-muted"}>
          {formatDate(event.startsAt)}
        </div>
        <div className={ended ? "text-white/35" : "text-white/45"}>
          {formatRelative(event.startsAt)}
        </div>
      </div>
      <div className="relative z-10 flex min-w-0 flex-wrap justify-end gap-1.5">
        <EventStatusActions
          eventId={event.id}
          status={status}
          revalidatePath="/events"
        />
      </div>
    </div>
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
          No hay conexión con la API
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
