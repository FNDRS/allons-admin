/**
 * Reglas de un tipo de entrada, separadas de la server action para poder
 * probarlas y para que el formulario muestre el mismo mensaje que el guardado
 * rechaza.
 */

export interface TicketTypeInput {
  name: string;
  priceCents: number;
  total: number;
  active: boolean;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
}

export interface TicketTypeContext {
  /** Cuántas entradas de este tier ya se vendieron. */
  soldCount: number;
  /** Precio actual en centavos, para avisar si cambia con ventas hechas. */
  currentPriceCents: number;
  /** Fin del día del evento; la venta no puede terminar después. */
  eventDayEnd: Date | null;
}

export interface TicketTypeCheck {
  /** Impide guardar. */
  errors: string[];
  /** Deja guardar, pero hay que decirlo. */
  warnings: string[];
}

/** Precio máximo por entrada, el mismo tope que usa la API en el cobro. */
const MAX_PRICE_CENTS = 5_000_000;

export function checkTicketType(
  input: TicketTypeInput,
  context: TicketTypeContext,
): TicketTypeCheck {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!input.name.trim()) {
    errors.push("El nombre no puede quedar vacío.");
  }

  if (!Number.isFinite(input.priceCents) || input.priceCents < 0) {
    errors.push("El precio tiene que ser un número mayor o igual a cero.");
  } else if (input.priceCents > MAX_PRICE_CENTS) {
    errors.push("El precio supera el máximo permitido por entrada.");
  }

  // Bajar el cupo por debajo de lo vendido deja el tier en negativo y la app
  // empieza a rechazar reservas de gente que ya pagó.
  if (!Number.isInteger(input.total) || input.total < 0) {
    errors.push("El cupo tiene que ser un número entero mayor o igual a cero.");
  } else if (input.total < context.soldCount) {
    errors.push(
      `Ya se vendieron ${context.soldCount}; el cupo no puede quedar por debajo.`,
    );
  }

  const paid = input.priceCents > 0;
  const startsAt = paid ? parseDate(input.saleStartsAt) : null;
  const endsAt = paid ? parseDate(input.saleEndsAt) : null;

  if (paid && input.saleStartsAt && !startsAt) {
    errors.push("La fecha de inicio de venta no es válida.");
  }
  if (paid && input.saleEndsAt && !endsAt) {
    errors.push("La fecha de fin de venta no es válida.");
  }

  // La API exige la ventana completa en cuanto el tier cobra: sin ella el
  // evento deja de venderse y el motivo no se ve por ningún lado.
  if (paid && (!startsAt || !endsAt)) {
    errors.push("Un tier con precio necesita fecha de inicio y de fin de venta.");
  }

  if (startsAt && endsAt && startsAt.getTime() >= endsAt.getTime()) {
    errors.push("La venta tiene que abrir antes de cerrar.");
  }

  if (endsAt && context.eventDayEnd && endsAt > context.eventDayEnd) {
    errors.push("La venta no puede terminar después del día del evento.");
  }

  if (context.soldCount > 0 && input.priceCents !== context.currentPriceCents) {
    warnings.push(
      `Este tier ya vendió ${context.soldCount}; el precio nuevo no cambia lo ya cobrado.`,
    );
  }

  if (context.soldCount > 0 && !input.active) {
    warnings.push(
      "Desactivarlo lo saca de la venta; quien ya compró conserva su entrada.",
    );
  }

  return { errors, warnings };
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
