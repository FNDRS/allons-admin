import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { listPaymentOrders } from "@/lib/admin/paymentsApi";

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
  const admin = createSupabaseServiceRoleClient();
  const [totalRes, activeRes] = await Promise.all([
    admin
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
    admin
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .is("cancelled_at", null),
  ]);

  return {
    total: totalRes.count ?? 0,
    active: activeRes.count ?? 0,
  };
}

export async function listEventTicketTypes(
  eventId: string,
): Promise<EventTicketTypeRow[]> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from("provider_event_ticket_types")
    .select("id, name, price, total, sold_count, active")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[eventDetail] ticket types:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    price: Number(row.price),
    total: Number(row.total),
    soldCount: Number(row.sold_count ?? 0),
    active: Boolean(row.active),
  }));
}

export async function listEventAuditLogs(
  eventId: string,
): Promise<EventAuditLogRow[]> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from("admin_audit_logs")
    .select(
      "id, occurred_at, action, outcome, actor_email, state_after, error_message",
    )
    .eq("resource_id", eventId)
    .eq("resource_type", "event")
    .order("occurred_at", { ascending: false })
    .limit(30);

  if (error) {
    console.warn("[eventDetail] audit logs:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    occurredAt: String(row.occurred_at),
    action: String(row.action),
    outcome: String(row.outcome),
    actorEmail: (row.actor_email as string | null) ?? null,
    stateAfter: (row.state_after as Record<string, unknown>) ?? {},
    errorMessage: (row.error_message as string | null) ?? null,
  }));
}

/** Owner user id for linking to /providers/[userId]. */
export async function resolveProviderOwnerUserId(
  providerId: string | null,
): Promise<string | null> {
  if (!providerId) return null;
  const admin = createSupabaseServiceRoleClient();
  const { data } = await admin
    .from("provider_members")
    .select("user_id, role")
    .eq("provider_id", providerId)
    .eq("role", "owner")
    .maybeSingle();

  if (data?.user_id) return String(data.user_id);

  const { data: anyMember } = await admin
    .from("provider_members")
    .select("user_id")
    .eq("provider_id", providerId)
    .limit(1)
    .maybeSingle();

  return anyMember?.user_id ? String(anyMember.user_id) : null;
}
