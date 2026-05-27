import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { listAdminEvents } from "@/lib/admin/eventsApi";
import { listSubscriptionOrders } from "@/lib/admin/subscriptionOrdersApi";

export interface ProviderDbRow {
  id: string;
  name: string;
  handle: string | null;
  description: string | null;
  websiteUrl: string | null;
  createdAt: string;
  membershipRole: string | null;
}

export interface ProviderMemberRow {
  userId: string;
  role: string;
  fullName: string | null;
  email: string | null;
  active: boolean;
}

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

export interface ProviderEventPaymentRow {
  id: string;
  eventId: string;
  eventTitle: string;
  amountCents: number;
  currency: string;
  status: string;
  quantity: number;
  createdAt: string;
}

export interface ProviderTicketStats {
  total: number;
  active: number;
}

export async function resolveProviderForUser(userId: string): Promise<{
  provider: ProviderDbRow | null;
  members: ProviderMemberRow[];
}> {
  const admin = createSupabaseServiceRoleClient();
  const { data: membership } = await admin
    .from("provider_members")
    .select("provider_id, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership?.provider_id) {
    return { provider: null, members: [] };
  }

  const providerId = String(membership.provider_id);

  const [providerRes, membersRes] = await Promise.all([
    admin
      .from("providers")
      .select("id, name, handle, description, website_url, created_at")
      .eq("id", providerId)
      .maybeSingle(),
    admin
      .from("provider_members")
      .select("user_id, role, full_name, email, active")
      .eq("provider_id", providerId),
  ]);

  const row = providerRes.data;
  if (!row) {
    return { provider: null, members: [] };
  }

  return {
    provider: {
      id: String(row.id),
      name: String(row.name),
      handle: (row.handle as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      websiteUrl: (row.website_url as string | null) ?? null,
      createdAt: String(row.created_at),
      membershipRole: (membership.role as string | null) ?? null,
    },
    members: (membersRes.data ?? []).map((m) => ({
      userId: String(m.user_id),
      role: String(m.role),
      fullName: (m.full_name as string | null) ?? null,
      email: (m.email as string | null) ?? null,
      active: Boolean(m.active),
    })),
  };
}

export async function listProviderAuditLogs(
  userId: string,
  providerId?: string | null,
): Promise<ProviderAuditLogRow[]> {
  const admin = createSupabaseServiceRoleClient();
  const resourceIds = [userId];
  if (providerId) resourceIds.push(providerId);

  const { data, error } = await admin
    .from("admin_audit_logs")
    .select(
      "id, occurred_at, action, outcome, actor_email, state_before, state_after, error_message",
    )
    .in("resource_id", resourceIds)
    .order("occurred_at", { ascending: false })
    .limit(50);

  if (error) {
    console.warn("[providerDetail] audit logs:", error.message);
    return [];
  }

  return (data ?? [])
    .filter((row) => String(row.action).startsWith("provider."))
    .map((row) => ({
      id: String(row.id),
      occurredAt: String(row.occurred_at),
      action: String(row.action),
      outcome: String(row.outcome),
      actorEmail: (row.actor_email as string | null) ?? null,
      stateBefore: (row.state_before as Record<string, unknown>) ?? {},
      stateAfter: (row.state_after as Record<string, unknown>) ?? {},
      errorMessage: (row.error_message as string | null) ?? null,
    }));
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
  const admin = createSupabaseServiceRoleClient();
  const { data: events, error: eventsError } = await admin
    .from("events")
    .select("id, title")
    .eq("provider_id", providerId);

  if (eventsError) {
    console.warn("[providerDetail] events lookup:", eventsError.message);
    return [];
  }

  const eventRows = events ?? [];
  const eventIds = eventRows.map((e) => String(e.id));
  if (eventIds.length === 0) return [];

  const titleById = new Map(
    eventRows.map((e) => [String(e.id), String(e.title)]),
  );

  const { data: orders, error: ordersError } = await admin
    .from("payment_orders")
    .select(
      "id, event_id, amount_cents, currency, status, quantity, created_at",
    )
    .in("event_id", eventIds)
    .order("created_at", { ascending: false })
    .limit(100);

  if (ordersError) {
    console.warn("[providerDetail] payment orders:", ordersError.message);
    return [];
  }

  return (orders ?? []).map((o) => ({
    id: String(o.id),
    eventId: String(o.event_id),
    eventTitle: titleById.get(String(o.event_id)) ?? "Evento",
    amountCents: Number(o.amount_cents),
    currency: String(o.currency ?? "HNL"),
    status: String(o.status),
    quantity: Number(o.quantity ?? 1),
    createdAt: String(o.created_at),
  }));
}

export async function countTicketsForProviderEvents(
  providerId: string,
): Promise<ProviderTicketStats> {
  const admin = createSupabaseServiceRoleClient();
  const { data: events, error: eventsError } = await admin
    .from("events")
    .select("id")
    .eq("provider_id", providerId);

  if (eventsError || !events?.length) {
    return { total: 0, active: 0 };
  }

  const eventIds = events.map((e) => String(e.id));

  const [totalRes, activeRes] = await Promise.all([
    admin
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .in("event_id", eventIds),
    admin
      .from("tickets")
      .select("*", { count: "exact", head: true })
      .in("event_id", eventIds)
      .is("cancelled_at", null),
  ]);

  return {
    total: totalRes.count ?? 0,
    active: activeRes.count ?? 0,
  };
}
