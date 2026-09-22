"use client";

import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { updateEventTicketType } from "@/lib/admin/eventActions";
import { TICKET_TYPE_SAVE_IDLE } from "@/lib/admin/ticketTypeSaveState";
import type { EventTicketTypeRow as TicketType } from "@/lib/admin/ticketTypeSaveState";

/**
 * Una fila de la tabla de tipos de entrada que se abre para editarse.
 *
 * Cerrada muestra lo mismo que antes. Abierta deja cambiar nombre, precio,
 * cupo, ventana de venta y si sigue a la venta, que es lo que cambia después
 * de publicar un evento.
 */
export function EventTicketTypeEditableRow({
  ticketType,
  eventId,
  revalidatePath,
}: {
  ticketType: TicketType;
  eventId: string;
  revalidatePath: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateEventTicketType,
    TICKET_TYPE_SAVE_IDLE,
  );
  const inputId = (field: string) => `tt-${ticketType.id}-${field}`;

  // Un guardado limpio cierra la fila. Con avisos se queda abierta para que
  // se lean: son cosas que ya se aplicaron, no preguntas.
  useEffect(() => {
    if (state.ok && state.warnings.length === 0) setOpen(false);
  }, [state]);

  if (!open) {
    return (
      <tr className="border-b border-white/8 last:border-0">
        <td className="py-2.5 pr-4 font-medium">
          {ticketType.name}
          {!ticketType.active ? (
            <span className="ml-2 text-xs text-muted">(inactivo)</span>
          ) : null}
        </td>
        <td className="py-2.5 pr-4 text-right tabular-nums">
          {money(Math.round(ticketType.price * 100))}
        </td>
        <td className="py-2.5 pr-4 text-right tabular-nums">
          {ticketType.soldCount}
        </td>
        <td className="py-2.5 pr-4 text-right tabular-nums">
          {ticketType.total}
        </td>
        <td className="py-2.5 text-right">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Editar
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-white/8 last:border-0">
      <td colSpan={5} className="py-4">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="ticketTypeId" value={ticketType.id} />
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="revalidate" value={revalidatePath} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor={inputId("name")}>Nombre</Label>
              <Input
                id={inputId("name")}
                name="name"
                defaultValue={ticketType.name}
                maxLength={120}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={inputId("price")}>Precio (L)</Label>
              <Input
                id={inputId("price")}
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={ticketType.price.toFixed(2)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={inputId("total")}>Cupo</Label>
              <Input
                id={inputId("total")}
                name="total"
                type="number"
                step="1"
                min={ticketType.soldCount}
                defaultValue={String(ticketType.total)}
                required
              />
              {ticketType.soldCount > 0 ? (
                <p className="text-xs text-muted">
                  No puede bajar de {ticketType.soldCount}, ya vendidos.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor={inputId("active")}>A la venta</Label>
              <div className="flex h-10 items-center gap-2">
                <Checkbox
                  id={inputId("active")}
                  name="active"
                  defaultChecked={ticketType.active}
                />
                <span className="text-sm text-white/60">
                  Visible para comprar
                </span>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Venta abre</Label>
              <SaleDateTime
                name="saleStartsAt"
                defaultValue={toLocalInput(ticketType.saleStartsAt)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Venta cierra</Label>
              <SaleDateTime
                name="saleEndsAt"
                defaultValue={toLocalInput(ticketType.saleEndsAt)}
              />
            </div>
          </div>

          <p className="text-xs leading-5 text-white/40">
            Un tier con precio necesita las dos fechas: sin ellas el evento deja
            de venderse y la app no explica por qué.
          </p>

          {state.error ? (
            <p className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm leading-6 text-red-200/90">
              {state.error}
            </p>
          ) : null}

          {state.warnings.length > 0 ? (
            <ul className="space-y-1 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm leading-6 text-amber-200/90">
              {state.ok ? <li className="font-medium">Guardado.</li> : null}
              {state.warnings.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="brand" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </td>
    </tr>
  );
}

/**
 * Fecha y hora en un solo valor `YYYY-MM-DDTHH:mm`, hora local, sin zona.
 * El guardado lo convierte a ISO.
 */
function SaleDateTime({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const initial = splitLocal(defaultValue);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const value = date && time ? `${date}T${time}` : "";

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={value} />
      <DatePicker
        value={date}
        onChange={setDate}
        placeholder="Fecha"
        className="min-w-0 flex-1"
      />
      <TimePicker
        value={time}
        onChange={setTime}
        placeholder="Hora"
        className="w-28 shrink-0"
      />
    </div>
  );
}

function splitLocal(value: string): { date: string; time: string } {
  const [date, time] = value.split("T");
  if (!date || !time) return { date: "", time: "" };
  return { date, time };
}

/** `YYYY-MM-DDTHH:mm` en hora local, sin zona. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

function money(cents: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
    maximumFractionDigits: 2,
  }).format(cents / 100);
}
