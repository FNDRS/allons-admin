import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { Calendar, MapPin, Plug, Ticket, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default function EventsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Catálogo"
        title="Eventos"
        description="Vista global de la actividad de eventos en la plataforma. Pendiente de exponer la tabla de eventos vía RPC para mostrar datos reales."
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Eventos publicados" value="—" hint="Tabla pendiente" icon={Calendar} />
        <KpiCard label="Eventos hoy" value="—" hint="Tabla pendiente" icon={Calendar} />
        <KpiCard label="Tickets reservados" value="—" hint="Tabla pendiente" icon={Ticket} />
        <KpiCard label="Asistentes confirmados" value="—" hint="Tabla pendiente" icon={Users} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="futuristic-panel p-6">
          <div className="eyebrow mb-3">Filtros previstos</div>
          <ul className="space-y-2 text-sm text-muted">
            <li>• Por proveedor</li>
            <li>• Por estado (publicado · agotado · finalizado · borrador)</li>
            <li>• Por ciudad / departamento</li>
            <li>• Por categoría / tipo</li>
            <li>• Por rango de fechas</li>
          </ul>
        </div>

        <div className="futuristic-panel p-6">
          <div className="eyebrow mb-3">Acciones planeadas</div>
          <ul className="space-y-2 text-sm text-muted">
            <li>• Forzar despublicación de un evento.</li>
            <li>• Marcar evento como destacado en el feed del cliente.</li>
            <li>• Ver scans / asistencia en tiempo real.</li>
            <li>• Auditoría de cambios de capacidad y precio.</li>
          </ul>
        </div>
      </section>

      <section className="futuristic-panel mt-8 flex flex-col items-center gap-4 p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center border border-white/15">
          <Plug size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-tight">
            Conexión pendiente
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            La tabla de eventos del backend (`events`) aún no está expuesta al
            admin. Una vez que tengamos un endpoint o RPC con permisos service
            role, esta página listará todos los eventos con filtros y acciones.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <StatusPill label="Backend" variant="muted" />
          <span className="text-muted">·</span>
          <StatusPill label="Sin conectar" variant="warning" />
          <span className="text-muted">·</span>
          <span className="flex items-center gap-1 text-muted">
            <MapPin size={12} /> events table
          </span>
        </div>
      </section>
    </div>
  );
}
