"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import type { AdminEventTicketTypeRow } from "@/lib/admin/eventsApi";
import { useState } from "react";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function splitLocal(iso: string | null) {
  if (!iso) return { date: "", time: "" };
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return { date: "", time: "" };
  return {
    date: `${parsed.getFullYear()}-${pad2(parsed.getMonth() + 1)}-${pad2(parsed.getDate())}`,
    time: `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`,
  };
}

function money(price: number) {
  return `L ${price.toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Cierre de venta de cada entrada de pago.
 *
 * Va dentro del formulario de editar evento. El valor viaja como
 * `YYYY-MM-DDTHH:mm` local y el action lo convierte a ISO.
 */
export function EventTicketSaleEndField({
  tickets,
}: {
  tickets: AdminEventTicketTypeRow[];
}) {
  const paid = tickets.filter((ticket) => ticket.price > 0);

  return (
    <section className="futuristic-panel p-5">
      <div className="eyebrow">Venta</div>
      <h2 className="mt-1 text-xl font-semibold">Cuándo cierra la venta</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
        Cada entrada de pago deja de venderse en la fecha que indiques. Tiene
        que ser antes de que termine el día del evento.
      </p>

      {paid.length === 0 ? (
        <p className="mt-4 text-sm text-white/45">
          Este evento no tiene entradas de pago, así que no hay cierre de venta.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {paid.map((ticket) => (
            <SaleEndRow key={ticket.id} ticket={ticket} />
          ))}
        </div>
      )}
    </section>
  );
}

function SaleEndRow({ ticket }: { ticket: AdminEventTicketTypeRow }) {
  const initial = splitLocal(ticket.saleEndsAt);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const value = date && time ? `${date}T${time}` : "";

  return (
    <div className="grid gap-3 border border-white/10 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-end">
      <input type="hidden" name="ticketSaleId" value={ticket.id} />
      <input type="hidden" name={`saleEndsAt_${ticket.id}`} value={value} />
      <div>
        <p className="text-sm font-medium">{ticket.name}</p>
        <p className="mt-1 text-xs text-white/45">{money(ticket.price)}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Fecha de cierre</Label>
          <DatePicker value={date} onChange={setDate} placeholder="Fecha" />
        </div>
        <div>
          <Label>Hora de cierre</Label>
          <TimePicker value={time} onChange={setTime} placeholder="Hora" />
        </div>
      </div>
    </div>
  );
}
