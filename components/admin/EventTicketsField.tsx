"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deriveSaleWindowInput, type EventTicketDraft } from "@/lib/eventTickets";
import { Trash2 } from "lucide-react";
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

/**
 * Tipos de entrada y política de reembolso, con la misma mecánica que
 * `EventTicketBuilder` + `EventRefundPolicySection` del mobile: se arma un
 * borrador y se agrega a la lista, y el borrador en pantalla también se guarda
 * al enviar si está completo.
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
  const [drafts, setDrafts] = useState<EventTicketDraft[]>([]);
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

  /** El borrador visible, sólo cuando ya es guardable. */
  const currentDraft = useMemo<EventTicketDraft | null>(() => {
    const resolvedName = name.trim();
    const parsedQuantity = Number(quantity);
    if (!resolvedName) return null;
    if (!price.trim()) return null;
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return null;
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) return null;
    if (parsedPrice > 0 && saleWindow.error) return null;
    return {
      id: "current",
      name: resolvedName,
      kind: "general",
      price: parsedPrice,
      total: Math.floor(parsedQuantity),
      saleStartsAt: parsedPrice > 0 ? saleWindow.saleStartsAt : null,
      saleEndsAt: parsedPrice > 0 ? saleWindow.saleEndsAt : null,
    };
  }, [name, price, parsedPrice, quantity, saleWindow]);

  const allDrafts = useMemo(
    () => (currentDraft ? [...drafts, currentDraft] : drafts),
    [drafts, currentDraft],
  );
  const hasAnyPaidTicket = allDrafts.some((draft) => draft.price > 0);
  const totalTickets = allDrafts.reduce((sum, draft) => sum + draft.total, 0);
  const parsedCapacity = Number(capacity);
  const exceedsCapacity =
    Number.isFinite(parsedCapacity) &&
    parsedCapacity > 0 &&
    totalTickets > parsedCapacity;

  const addDraft = () => {
    if (!currentDraft) return;
    setDrafts((current) => [
      ...current,
      { ...currentDraft, id: `ticket-${Date.now()}-${current.length}` },
    ]);
    setName("");
    setPrice("");
    setQuantity("");
  };

  const removeDraft = (id: string) => {
    setDrafts((current) => current.filter((draft) => draft.id !== id));
  };

  const updateDraftTotal = (id: string, value: string) => {
    const parsed = Number(onlyDigits(value));
    setDrafts((current) =>
      current.map((draft) =>
        draft.id === id
          ? { ...draft, total: Number.isFinite(parsed) ? parsed : 0 }
          : draft,
      ),
    );
  };

  return (
    <div className="futuristic-panel p-5">
      <input
        type="hidden"
        name="ticketTypes"
        value={JSON.stringify(
          allDrafts.map(({ id: _id, ...draft }) => draft),
        )}
      />
      <input type="hidden" name="refundPolicy" value={hasAnyPaidTicket ? refundPolicy : "none"} />
      <input
        type="hidden"
        name="refundPartialPct"
        value={hasAnyPaidTicket && refundPolicy === "partial" ? refundPartialPct : ""}
      />
      <input
        type="hidden"
        name="refundDeadlineDays"
        value={hasAnyPaidTicket && refundPolicy !== "none" ? refundDeadlineDays : ""}
      />

      <div className="eyebrow">Tickets</div>
      <h2 className="mt-1 text-xl font-semibold">Tipos de entrada</h2>
      <p className="mt-2 text-sm leading-6 text-white/50">
        Agrega los tipos que necesites (General, VIP, Preventa…). Si el precio
        es 0, el evento se publica como registro gratuito.
      </p>

      {drafts.length > 0 ? (
        <div className="mt-4 space-y-2">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"
            >
              <div className="min-w-40 flex-1">
                <p className="text-sm font-medium text-white">{draft.name}</p>
                <p className="text-xs text-white/45">
                  {draft.price > 0 ? `L ${draft.price}` : "Gratis"}
                  {draft.saleEndsAt
                    ? ` · venta hasta ${new Date(draft.saleEndsAt).toLocaleString("es-HN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : ""}
                </p>
              </div>
              <div className="w-28">
                <Input
                  aria-label={`Cantidad de ${draft.name}`}
                  value={String(draft.total)}
                  inputMode="numeric"
                  onChange={(event) =>
                    updateDraftTotal(draft.id, event.target.value)
                  }
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Quitar ${draft.name}`}
                onClick={() => removeDraft(draft.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-4 rounded-lg border border-white/10 p-4">
        <div>
          <Label>Tipo de ticket</Label>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Inicio</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={saleStartDate}
                    onChange={(event) => setSaleStartDate(event.target.value)}
                  />
                  <Input
                    type="time"
                    value={saleStartTime}
                    onChange={(event) => setSaleStartTime(event.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Fin</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={saleEndDate}
                    onChange={(event) => setSaleEndDate(event.target.value)}
                  />
                  <Input
                    type="time"
                    value={saleEndTime}
                    onChange={(event) => setSaleEndTime(event.target.value)}
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
          variant="outline"
          disabled={!currentDraft}
          onClick={addDraft}
          className="w-full"
        >
          Agregar otro tipo de ticket
        </Button>
        <p className="text-xs leading-5 text-white/35">
          El tipo que quede escrito aquí también se guarda al crear el evento; no
          hace falta agregarlo si es el único.
        </p>
      </div>

      {exceedsCapacity ? (
        <p className="mt-3 text-xs text-[#F67010]">
          La cantidad de tickets ({totalTickets}) supera la capacidad del evento
          ({parsedCapacity}).
        </p>
      ) : null}

      {hasAnyPaidTicket ? (
        <div className="mt-5 border-t border-white/10 pt-5">
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
            <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-white/55">
              Al seleccionar «Completo», el cliente recibirá un reembolso
              parcial: Allons retiene su comisión (8% + ISV) y el cargo de
              Paygate. Solo se devuelve el monto que corresponde al organizador.
            </p>
          ) : null}

          {refundPolicy === "partial" ? (
            <div className="mt-3">
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

          {refundPolicy !== "none" ? (
            <div className="mt-3">
              <Label>Plazo de solicitud (días antes del evento)</Label>
              <Input
                value={refundDeadlineDays}
                inputMode="numeric"
                maxLength={3}
                onChange={(event) =>
                  setRefundDeadlineDays(onlyDigits(event.target.value))
                }
                placeholder="2"
              />
              <p className="mt-1.5 text-xs text-white/40">
                El cliente puede solicitar el reembolso hasta{" "}
                {refundDeadlineDays || "—"} día(s) antes del inicio del evento.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
