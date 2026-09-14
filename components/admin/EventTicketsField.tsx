"use client";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { deriveSaleWindowInput, type EventTicketDraft } from "@/lib/eventTickets";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

type RefundPolicy = "none" | "partial" | "full";

const REFUND_OPTIONS: { key: RefundPolicy; label: string }[] = [
  { key: "none", label: "Sin reembolso" },
  { key: "partial", label: "Parcial" },
  { key: "full", label: "Completo" },
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function onlyDecimal(value: string) {
  return value.replace(/[^\d.]/g, "");
}

function formatSaleEnd(iso: string) {
  return new Date(iso).toLocaleString("es-HN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Tipos de entrada y política de reembolso.
 *
 * Sólo se guarda lo que el usuario confirmó con «Agregar tipo»: lo que queda
 * escrito en el formulario de la izquierda es un borrador y no se envía, para
 * que no haya duda de qué entradas va a tener el evento.
 */
export function EventTicketsField({
  eventDate,
  eventTime,
  capacity,
}: {
  eventDate: string;
  eventTime: string;
  capacity: string;
}) {
  const [tickets, setTickets] = useState<EventTicketDraft[]>([]);
  const [name, setName] = useState("General");
  const [price, setPrice] = useState("0");
  const [quantity, setQuantity] = useState("100");

  const [saleStartDate, setSaleStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [saleStartTime, setSaleStartTime] = useState(() =>
    new Date().toTimeString().slice(0, 5),
  );
  const [saleEndDate, setSaleEndDate] = useState(eventDate);
  const [saleEndTime, setSaleEndTime] = useState(eventTime);

  const [refundPolicy, setRefundPolicy] = useState<RefundPolicy>("none");
  const [refundPartialPct, setRefundPartialPct] = useState("50");
  const [refundDeadlineDays, setRefundDeadlineDays] = useState("2");

  const parsedPrice = Number(price);
  const isPaidDraft = Number.isFinite(parsedPrice) && parsedPrice > 0;

  const eventStartsAt = useMemo(() => {
    const parsed = new Date(`${eventDate}T${eventTime}:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }, [eventDate, eventTime]);

  const saleWindow = useMemo(
    () =>
      deriveSaleWindowInput({
        price: parsedPrice,
        saleStartDate,
        saleStartTime,
        saleEndDate,
        saleEndTime,
        eventStartsAt,
      }),
    [
      parsedPrice,
      saleStartDate,
      saleStartTime,
      saleEndDate,
      saleEndTime,
      eventStartsAt,
    ],
  );

  /** El borrador en pantalla, sólo cuando ya se puede agregar a la lista. */
  const draft = useMemo<Omit<EventTicketDraft, "id"> | null>(() => {
    const resolvedName = name.trim();
    const parsedQuantity = Number(quantity);
    if (!resolvedName) return null;
    if (!price.trim()) return null;
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return null;
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) return null;
    if (parsedPrice > 0 && saleWindow.error) return null;
    return {
      name: resolvedName,
      kind: "general",
      price: parsedPrice,
      total: Math.floor(parsedQuantity),
      saleStartsAt: parsedPrice > 0 ? saleWindow.saleStartsAt : null,
      saleEndsAt: parsedPrice > 0 ? saleWindow.saleEndsAt : null,
    };
  }, [name, price, parsedPrice, quantity, saleWindow]);

  const hasAnyPaidTicket = tickets.some((ticket) => ticket.price > 0);
  const totalTickets = tickets.reduce((sum, ticket) => sum + ticket.total, 0);
  const parsedCapacity = Number(capacity);
  const exceedsCapacity =
    Number.isFinite(parsedCapacity) &&
    parsedCapacity > 0 &&
    totalTickets > parsedCapacity;

  const addTicket = () => {
    if (!draft) return;
    setTickets((current) => [
      ...current,
      { ...draft, id: `ticket-${Date.now()}-${current.length}` },
    ]);
    setName("");
    setPrice("");
    setQuantity("");
  };

  const removeTicket = (id: string) => {
    setTickets((current) => current.filter((ticket) => ticket.id !== id));
  };

  const updateTicketTotal = (id: string, value: string) => {
    const parsed = Number(onlyDigits(value));
    setTickets((current) =>
      current.map((ticket) =>
        ticket.id === id
          ? { ...ticket, total: Number.isFinite(parsed) ? parsed : 0 }
          : ticket,
      ),
    );
  };

  return (
    <div className="futuristic-panel p-5">
      <input
        type="hidden"
        name="ticketTypes"
        value={JSON.stringify(tickets.map(({ id: _id, ...ticket }) => ticket))}
      />
      <input
        type="hidden"
        name="refundPolicy"
        value={hasAnyPaidTicket ? refundPolicy : "none"}
      />
      <input
        type="hidden"
        name="refundPartialPct"
        value={
          hasAnyPaidTicket && refundPolicy === "partial" ? refundPartialPct : ""
        }
      />
      <input
        type="hidden"
        name="refundDeadlineDays"
        value={
          hasAnyPaidTicket && refundPolicy !== "none" ? refundDeadlineDays : ""
        }
      />

      <div className="eyebrow">Tickets</div>
      <h2 className="mt-1 text-xl font-semibold">Tipos de entrada</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
        Llena el tipo de entrada y presiona <strong>Agregar tipo</strong>: recién
        ahí se suma al evento. Podés agregar varios (General, VIP, Preventa…).
        Si el precio es 0, el evento se publica como registro gratuito.
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* Columna izquierda: el borrador que todavía no forma parte del evento. */}
        <div className="space-y-4 rounded-lg border border-dashed border-white/20 bg-white/[0.02] p-4">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">
            Nuevo tipo de entrada
          </p>

          <div>
            <Label>Nombre</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej. General, VIP, Preventa"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Precio (HNL)</Label>
              <Input
                value={price}
                inputMode="decimal"
                onChange={(event) => setPrice(onlyDecimal(event.target.value))}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Cantidad</Label>
              <Input
                value={quantity}
                inputMode="numeric"
                onChange={(event) => setQuantity(onlyDigits(event.target.value))}
                placeholder="100"
              />
            </div>
          </div>

          {isPaidDraft ? (
            <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">
                Ventana de venta
              </p>
              <div className="space-y-3">
                <div>
                  <Label>Inicio</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <DatePicker
                      value={saleStartDate}
                      onChange={setSaleStartDate}
                    />
                    <TimePicker
                      value={saleStartTime}
                      onChange={setSaleStartTime}
                    />
                  </div>
                </div>
                <div>
                  <Label>Fin</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <DatePicker
                      value={saleEndDate}
                      onChange={setSaleEndDate}
                    />
                    <TimePicker
                      value={saleEndTime}
                      onChange={setSaleEndTime}
                    />
                  </div>
                </div>
              </div>
              {saleWindow.error ? (
                <p className="text-xs text-red-300">{saleWindow.error}</p>
              ) : null}
            </div>
          ) : null}

          <Button
            type="button"
            variant="brand"
            disabled={!draft}
            onClick={addTicket}
            className="w-full"
          >
            <Plus size={14} />
            Agregar tipo
          </Button>
        </div>

        {/* Columna derecha: lo que realmente se va a guardar. */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">
              Entradas del evento
            </p>
            {tickets.length > 0 ? (
              <span className="text-xs text-white/45">
                {tickets.length} {tickets.length === 1 ? "tipo" : "tipos"} ·{" "}
                {totalTickets} tickets
              </span>
            ) : null}
          </div>

          {tickets.length === 0 ? (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
              Todavía no agregaste ninguna entrada. Llena el formulario de la
              izquierda y presiona «Agregar tipo»; sin al menos una, el evento no
              se puede crear.
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="min-w-32 flex-1">
                    <p className="text-sm font-medium text-white">{ticket.name}</p>
                    <p className="text-xs text-white/45">
                      {ticket.price > 0 ? `L ${ticket.price}` : "Gratis"}
                      {ticket.saleEndsAt
                        ? ` · venta hasta ${formatSaleEnd(ticket.saleEndsAt)}`
                        : ""}
                    </p>
                  </div>
                  <div className="w-24">
                    <Input
                      aria-label={`Cantidad de ${ticket.name}`}
                      value={String(ticket.total)}
                      inputMode="numeric"
                      onChange={(event) =>
                        updateTicketTotal(ticket.id, event.target.value)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Quitar ${ticket.name}`}
                    onClick={() => removeTicket(ticket.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {exceedsCapacity ? (
            <p className="text-xs text-[#F67010]">
              La cantidad de tickets ({totalTickets}) supera la capacidad del
              evento ({parsedCapacity}).
            </p>
          ) : null}

          {hasAnyPaidTicket ? (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <Label>Política de reembolso</Label>
              <div className="flex flex-wrap gap-2">
                {REFUND_OPTIONS.map((option) => {
                  const active = option.key === refundPolicy;
                  return (
                    <Button
                      key={option.key}
                      type="button"
                      size="sm"
                      variant={active ? "brand" : "secondary"}
                      aria-pressed={active}
                      onClick={() => setRefundPolicy(option.key)}
                      className="normal-case tracking-normal"
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>

              {refundPolicy === "full" ? (
                <p className="mt-3 text-xs leading-5 text-white/55">
                  Al seleccionar «Completo», el cliente recibirá un reembolso
                  parcial: Allons retiene su comisión (8% + ISV) y el cargo de
                  Paygate. Solo se devuelve el monto que corresponde al
                  organizador.
                </p>
              ) : null}

              {refundPolicy !== "none" ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {refundPolicy === "partial" ? (
                    <div>
                      <Label>Porcentaje a devolver (%)</Label>
                      <Input
                        value={refundPartialPct}
                        inputMode="numeric"
                        maxLength={3}
                        onChange={(event) =>
                          setRefundPartialPct(onlyDigits(event.target.value))
                        }
                        placeholder="50"
                      />
                    </div>
                  ) : null}
                  <div>
                    <Label>Plazo (días antes del evento)</Label>
                    <Input
                      value={refundDeadlineDays}
                      inputMode="numeric"
                      maxLength={3}
                      onChange={(event) =>
                        setRefundDeadlineDays(onlyDigits(event.target.value))
                      }
                      placeholder="2"
                    />
                  </div>
                </div>
              ) : null}

              {refundPolicy !== "none" ? (
                <p className="mt-2 text-xs text-white/40">
                  El cliente puede solicitar el reembolso hasta{" "}
                  {refundDeadlineDays || "—"} día(s) antes del inicio del evento.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
