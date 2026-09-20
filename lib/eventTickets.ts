/**
 * Tipos de entrada y ventana de venta, con las mismas reglas que el formulario
 * de la app mobile (`lib/events.ts` → `deriveSaleWindowInput` y
 * `hooks/useEventForm.ts`).
 */

export type EventTicketDraft = {
  id: string;
  name: string;
  kind: "general" | "vip";
  price: number;
  total: number;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  /** Acepta que el comprador pague más que `price` (aporte voluntario). */
  donationEnabled: boolean;
};

export type SaleWindow = {
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  error: string | null;
};

/**
 * Sólo los tickets pagados tienen ventana de venta: los gratuitos quedan
 * abiertos hasta que empieza el evento.
 */
export function deriveSaleWindowInput(input: {
  price: number;
  saleStartDate: string;
  saleStartTime: string;
  saleEndDate: string;
  saleEndTime: string;
  eventStartsAt?: string | null;
}): SaleWindow {
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return { saleStartsAt: null, saleEndsAt: null, error: null };
  }

  const saleStartsAt = new Date(
    `${input.saleStartDate}T${input.saleStartTime}:00`,
  );
  const saleEndsAt = new Date(`${input.saleEndDate}T${input.saleEndTime}:00`);

  if (
    Number.isNaN(saleStartsAt.getTime()) ||
    Number.isNaN(saleEndsAt.getTime())
  ) {
    return {
      saleStartsAt: null,
      saleEndsAt: null,
      error: "Configura fechas válidas de venta.",
    };
  }
  if (saleStartsAt.getTime() >= saleEndsAt.getTime()) {
    return {
      saleStartsAt: null,
      saleEndsAt: null,
      error: "La venta debe iniciar antes de terminar.",
    };
  }

  const eventStart = input.eventStartsAt ? new Date(input.eventStartsAt) : null;
  if (eventStart && !Number.isNaN(eventStart.getTime())) {
    const eventDayEnd = new Date(
      eventStart.getFullYear(),
      eventStart.getMonth(),
      eventStart.getDate(),
      23,
      59,
      59,
      999,
    );
    if (saleEndsAt.getTime() > eventDayEnd.getTime()) {
      return {
        saleStartsAt: null,
        saleEndsAt: null,
        error: "La venta no puede terminar después del día del evento.",
      };
    }
  }

  return {
    saleStartsAt: saleStartsAt.toISOString(),
    saleEndsAt: saleEndsAt.toISOString(),
    error: null,
  };
}

function optionalIso(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Lee lo que el formulario envía en el input oculto `ticketTypes`. Devuelve
 * `null` cuando el JSON no tiene la forma esperada, para que la acción pueda
 * responder con un error en vez de crear un evento sin entradas.
 */
export function normalizeTicketDrafts(value: unknown): EventTicketDraft[] | null {
  if (!Array.isArray(value)) return null;

  const drafts: EventTicketDraft[] = [];
  for (const [index, raw] of value.entries()) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;

    const name = String(item.name ?? "").trim();
    const price = Number(item.price);
    const total = Math.floor(Number(item.total));
    if (!name) return null;
    if (!Number.isFinite(price) || price < 0) return null;
    if (!Number.isFinite(total) || total <= 0) return null;

    drafts.push({
      id: String(item.id ?? `ticket-${index}`),
      name,
      kind: item.kind === "vip" ? "vip" : "general",
      price,
      total,
      saleStartsAt: price > 0 ? optionalIso(item.saleStartsAt) : null,
      saleEndsAt: price > 0 ? optionalIso(item.saleEndsAt) : null,
      // Una entrada gratis no tiene precio base sobre el cual aportar, y el
      // checkout la rechaza igual: guardar la bandera sería mentir.
      donationEnabled: price > 0 && item.donationEnabled === true,
    });
  }

  return drafts;
}
