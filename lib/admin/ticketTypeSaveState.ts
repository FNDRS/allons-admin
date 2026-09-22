/**
 * Resultado de guardar un tipo de entrada.
 *
 * Vive aparte de `eventActions.ts` porque ese archivo es `"use server"` y sólo
 * puede exportar funciones async: una constante ahí rompe el build.
 */
export type TicketTypeSaveState = {
  ok: boolean;
  error: string | null;
  /** Se aplicó igual, pero hay que decirlo: precio movido con ventas, por ejemplo. */
  warnings: string[];
};

export const TICKET_TYPE_SAVE_IDLE: TicketTypeSaveState = {
  ok: false,
  error: null,
  warnings: [],
};
