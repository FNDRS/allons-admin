import "server-only";

import { listAdminAudit } from "@/lib/admin/auditApi";
import {
  getAdminEventTicketStats,
  listAdminEventTicketTypes,
} from "@/lib/admin/eventsApi";
import { listPaymentOrders } from "@/lib/admin/paymentsApi";
import { getProviderOwnerUserId } from "@/lib/admin/providersApi";

export interface EventTicketStats {
  total: number;
  active: number;
}

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
}

export interface EventAuditLogRow {
  id: string;
  occurredAt: string;
  action: string;
  outcome: string;
  actorEmail: string | null;
  stateAfter: Record<string, unknown>;
  errorMessage: string | null;
}

/** Etiquetas de los modos de cobro, espejo de las de allons-api. */
const FEE_MODE_LABELS: Record<string, string> = {
  provider_absorbs: "el comercio absorbe todo",
  buyer_pays_gateway: "el comprador paga la pasarela",
  buyer_pays_all: "el comprador paga todo",
};

/**
 * Qué dice una fila del audit log del evento.
 *
 * Vive aquí y no en la página porque el catálogo de acciones crece: sin esto,
 * cada acción nueva aparece como «Cambio de estado», que es justo lo que uno
 * no quiere leer cuando revisa quién tocó qué.
 */
export function describeEventAuditRow(row: EventAuditLogRow): string {
  if (row.action === "event.kit_pickup_patch") {
    const state = row.stateAfter;
    if ("has_kit_pickup_info" in state) {
      return state.has_kit_pickup_info
        ? "Retiro de kit: actualizado"
        : "Retiro de kit: quitado";
    }
    if ("has_kit_pickup_info_attempted" in state) {
      return state.has_kit_pickup_info_attempted
        ? "Intento de actualizar el retiro de kit"
        : "Intento de quitar el retiro de kit";
    }
    return "Retiro de kit";
  }

  if (row.action === "event.fees_patch") {
    const state = row.stateAfter as Record<string, unknown>;
    const parts: string[] = [];
    if ("feeMode" in state) {
      const mode = state.feeMode;
      parts.push(
        mode === null
          ? "modo: el del comercio"
          : `modo: ${FEE_MODE_LABELS[String(mode)] ?? String(mode)}`,
      );
    }
    for (const [key, label] of [
      ["allonsFeePct", "Allons"],
      ["gatewayFeePct", "pasarela"],
      ["isvPct", "ISV"],
    ] as const) {
      if (!(key in state)) continue;
      const value = state[key];
      parts.push(
        value === null
          ? `${label}: del comercio`
          : `${label}: ${String(value)}%`,
      );
    }
    if ("gatewayFixedCents" in state) {
      const cents = state.gatewayFixedCents;
      parts.push(
        cents === null
          ? "fijo pasarela: del comercio"
          : `fijo pasarela: L ${(Number(cents) / 100).toFixed(2)}`,
      );
    }
    return parts.length > 0
      ? `Comisiones: ${parts.join(", ")}`
      : "Comisiones del evento";
  }

  if (row.action === "event.create") return "Evento creado";

  if (row.stateAfter.status) return `Estado: ${String(row.stateAfter.status)}`;
  if (row.stateAfter.status_attempted) {
    return `Intento: ${String(row.stateAfter.status_attempted)}`;
  }
  return "Cambio de estado";
}

export async function loadEventPaymentOrders(eventId: string) {
  try {
    const data = await listPaymentOrders({ eventId, limit: 100 });
    return data.items;
  } catch (error) {
    console.error("[eventDetail] payment orders failed", error);
    return [];
  }
}

export async function countEventTickets(
  eventId: string,
): Promise<EventTicketStats> {
  try {
    return await getAdminEventTicketStats(eventId);
  } catch (error) {
    console.warn("[eventDetail] ticket stats:", error);
    return { total: 0, active: 0 };
  }
}

export async function listEventTicketTypes(
  eventId: string,
): Promise<EventTicketTypeRow[]> {
  try {
    const { items } = await listAdminEventTicketTypes(eventId);
    return items;
  } catch (error) {
    console.warn("[eventDetail] ticket types:", error);
    return [];
  }
}

export async function listEventAuditLogs(
  eventId: string,
): Promise<EventAuditLogRow[]> {
  const rows = await listAdminAudit({
    resourceIds: [eventId],
    resourceType: "event",
    limit: 30,
  });

  return rows.map((row) => ({
    id: row.id,
    occurredAt: row.occurredAt,
    action: row.action,
    outcome: row.outcome,
    actorEmail: row.actorEmail,
    stateAfter: row.stateAfter,
    errorMessage: row.errorMessage,
  }));
}

/** Owner user id for linking to /providers/[userId]. */
export async function resolveProviderOwnerUserId(
  providerId: string | null,
): Promise<string | null> {
  if (!providerId) return null;
  try {
    const { userId } = await getProviderOwnerUserId(providerId);
    return userId;
  } catch (error) {
    console.warn("[eventDetail] provider owner:", error);
    return null;
  }
}
