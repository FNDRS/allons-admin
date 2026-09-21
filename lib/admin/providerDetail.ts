import "server-only";

import { listAdminAudit, type AdminAuditRow } from "@/lib/admin/auditApi";
import { listAdminEvents } from "@/lib/admin/eventsApi";
import {
  getProviderDetail,
  getProviderTicketStats,
  listProviderEventPayments,
} from "@/lib/admin/providersApi";
import { listSubscriptionOrders } from "@/lib/admin/subscriptionOrdersApi";

export type {
  ProviderDbRow,
  ProviderMemberRow,
  ProviderEventPaymentRow,
  ProviderTicketStats,
} from "@/lib/admin/providersApi";

import type {
  ProviderDbRow,
  ProviderMemberRow,
  ProviderEventPaymentRow,
  ProviderTicketStats,
} from "@/lib/admin/providersApi";

export interface ProviderAuditLogRow {
  id: string;
  occurredAt: string;
  action: string;
  outcome: string;
  actorEmail: string | null;
  stateBefore: Record<string, unknown>;
  stateAfter: Record<string, unknown>;
  errorMessage: string | null;
}

export async function resolveProviderForUser(userId: string): Promise<{
  provider: ProviderDbRow | null;
  members: ProviderMemberRow[];
}> {
  try {
    return await getProviderDetail(userId);
  } catch (error) {
    console.error("[providerDetail] provider failed", error);
    return { provider: null, members: [] };
  }
}

export async function listProviderAuditLogs(
  userId: string,
  providerId?: string | null,
): Promise<ProviderAuditLogRow[]> {
  const resourceIds = [userId];
  if (providerId) resourceIds.push(providerId);

  const rows = await listAdminAudit({
    resourceIds,
    actionPrefix: "provider.",
    limit: 50,
  });

  return rows.map(toProviderAuditRow);
}

function toProviderAuditRow(row: AdminAuditRow): ProviderAuditLogRow {
  return {
    id: row.id,
    occurredAt: row.occurredAt,
    action: row.action,
    outcome: row.outcome,
    actorEmail: row.actorEmail,
    stateBefore: row.stateBefore,
    stateAfter: row.stateAfter,
    errorMessage: row.errorMessage,
  };
}

export async function loadProviderEvents(providerId: string) {
  try {
    return await listAdminEvents({ providerId, limit: 100 });
  } catch (error) {
    console.error("[providerDetail] events failed", error);
    return { total: 0, items: [] };
  }
}

export async function loadProviderSubscriptionOrders(userId: string) {
  try {
    const data = await listSubscriptionOrders();
    return data.items.filter((o) => o.userId === userId);
  } catch (error) {
    console.error("[providerDetail] subscription orders failed", error);
    return [];
  }
}

export async function listEventPaymentsForProvider(
  providerId: string,
): Promise<ProviderEventPaymentRow[]> {
  try {
    const { items } = await listProviderEventPayments(providerId);
    return items;
  } catch (error) {
    console.warn("[providerDetail] payment orders:", error);
    return [];
  }
}

export async function countTicketsForProviderEvents(
  providerId: string,
): Promise<ProviderTicketStats> {
  try {
    return await getProviderTicketStats(providerId);
  } catch (error) {
    console.warn("[providerDetail] ticket stats:", error);
    return { total: 0, active: 0 };
  }
}
