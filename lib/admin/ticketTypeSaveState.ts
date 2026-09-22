/**
 * Forma de un tipo de entrada en el panel.
 *
 * Vive aquí y no en `eventDetail.ts`: ese archivo es de servidor, y la fila
 * editable es un componente de cliente.
 */
export interface EventTicketTypeRow {
  id: string;
  name: string;
  price: number;
  total: number;
  soldCount: number;
  active: boolean;
  /** Null en un tier gratis; la API las exige en cuanto el precio es mayor a cero. */
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  /** El comprador puede pagar más que el precio. En un tier gratis queda en false. */
  donationEnabled: boolean;
}

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
