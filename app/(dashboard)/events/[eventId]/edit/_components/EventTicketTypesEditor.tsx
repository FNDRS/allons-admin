"use client";

import { EventTicketTypeEditableRow } from "@/app/(dashboard)/events/[eventId]/_components/EventTicketTypeRow";
import type { AdminEventTicketTypeRow } from "@/lib/admin/eventsApi";

/**
 * Cada tipo de entrada se guarda solo. No va dentro del formulario del evento:
 * un formulario anidado no se envía.
 */
export function EventTicketTypesEditor({
  eventId,
  tickets,
}: {
  eventId: string;
  tickets: AdminEventTicketTypeRow[];
}) {
  return (
    <section className="futuristic-panel p-5">
      <div className="eyebrow">Tickets</div>
      <h2 className="mt-1 text-xl font-semibold">Tipos de entrada</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
        Cada tipo se guarda con su propio botón. Podés cambiar nombre, precio,
        cupo, ventana de venta y si acepta aportes.
      </p>

      {tickets.length === 0 ? (
        <p className="mt-4 text-sm text-white/45">
          Este evento no tiene tipos de entrada.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-[10px] font-bold uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4 text-right">Precio</th>
                <th className="py-2 pr-4 text-right">Vendidos</th>
                <th className="py-2 pr-4 text-right">Total</th>
                <th className="py-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <EventTicketTypeEditableRow
                  key={ticket.id}
                  ticketType={ticket}
                  eventId={eventId}
                  revalidatePath={`/events/${eventId}/edit`}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
