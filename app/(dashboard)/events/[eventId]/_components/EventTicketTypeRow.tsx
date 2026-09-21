"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateEventTicketType,
  type UpdateEventTicketTypeState,
} from "@/lib/admin/eventActions";
import type { EventTicketTypeRow as TicketType } from "@/lib/admin/eventDetail";

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
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastHandledSuccessId, setLastHandledSuccessId] = useState<string | null>(
    null,
  );
  const inputId = (field: string) => `tt-${ticketType.id}-${field}`;
  const openEditor = useCallback(() => {
    setWarnings([]);
    setOpen(true);
  }, []);
  const closeEditor = useCallback(() => setOpen(false), []);
  const handleSaved = useCallback((nextWarnings: string[], resultId: string) => {
    setLastHandledSuccessId(resultId);
    setWarnings(nextWarnings);
    setOpen(false);
  }, []);

  if (!open) {
    return (
      <>
        <tr className="border-b border-white/8">
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
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={openEditor}
            >
              Editar
            </Button>
          </td>
        </tr>
        {warnings.length ? (
          <tr className="border-b border-white/8 last:border-0">
            <td colSpan={5} className="pb-4">
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="space-y-1 border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
              >
                <p>Guardado con aviso:</p>
                {warnings.map((warning, index) => (
                  <p key={`${ticketType.id}-warning-${index}`}>{warning}</p>
                ))}
              </div>
            </td>
          </tr>
        ) : null}
      </>
    );
  }

  return (
    <tr className="border-b border-white/8 last:border-0">
      <td colSpan={5} className="py-4">
        <EditableTicketTypeForm
          ticketType={ticketType}
          eventId={eventId}
          revalidatePath={revalidatePath}
          inputId={inputId}
          onCancel={closeEditor}
          lastHandledSuccessId={lastHandledSuccessId}
          onSaved={handleSaved}
        />
      </td>
    </tr>
  );
}

function EditableTicketTypeForm({
  ticketType,
  eventId,
  revalidatePath,
  inputId,
  onCancel,
  lastHandledSuccessId,
  onSaved,
}: {
  ticketType: TicketType;
  eventId: string;
  revalidatePath: string;
  inputId: (field: string) => string;
  onCancel: () => void;
  lastHandledSuccessId: string | null;
  onSaved: (warnings: string[], resultId: string) => void;
}) {
  const [state, action, isPending] = useActionState<UpdateEventTicketTypeState, FormData>(
    updateEventTicketType,
    null,
  );
  const latestRequestIdRef = useRef("");
  const submitAction = useCallback(
    (formData: FormData) => {
      const nextRequestId = createRequestId();
      latestRequestIdRef.current = nextRequestId;
      formData.set("requestId", nextRequestId);
      action(formData);
    },
    [action],
  );

  useEffect(() => {
    if (
      state?.ok &&
      state.requestId === latestRequestIdRef.current &&
      state.resultId !== lastHandledSuccessId
    ) {
      onSaved(state.warnings, state.resultId);
    }
  }, [lastHandledSuccessId, onSaved, state]);

  return (
    <form action={submitAction} className="space-y-4">
      <input type="hidden" name="ticketTypeId" value={ticketType.id} />
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="revalidate" value={revalidatePath} />

      {!state?.ok && state?.errors.length ? (
        <div
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          className="space-y-1 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100"
        >
          {state.errors.map((error, index) => (
            <p key={`${ticketType.id}-error-${index}`}>{error}</p>
          ))}
        </div>
      ) : null}

      {!state?.ok && state?.warnings.length ? (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="space-y-1 border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
        >
          {state.warnings.map((warning, index) => (
            <p key={`${ticketType.id}-form-warning-${index}`}>{warning}</p>
          ))}
        </div>
      ) : null}

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
            <span className="text-sm text-white/60">Visible para comprar</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={inputId("saleStartsAt")}>Venta abre</Label>
          <Input
            id={inputId("saleStartsAt")}
            name="saleStartsAt"
            type="datetime-local"
            defaultValue={toLocalInput(ticketType.saleStartsAt)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={inputId("saleEndsAt")}>Venta cierra</Label>
          <Input
            id={inputId("saleEndsAt")}
            name="saleEndsAt"
            type="datetime-local"
            defaultValue={toLocalInput(ticketType.saleEndsAt)}
          />
        </div>
      </div>

      <p className="text-xs leading-5 text-white/40">
        Un tier con precio necesita las dos fechas: sin ellas el evento deja de
        venderse y la app no explica por qué.
      </p>

      <p role="status" aria-live="polite" className="text-xs text-white/60">
        {isPending ? "Guardando cambios…" : "Listo para guardar cambios."}
      </p>

      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="brand" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

/** `datetime-local` quiere `YYYY-MM-DDTHH:mm` en hora local, sin zona. */
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

function createRequestId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}
