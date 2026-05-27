import { logAdminAudit } from "@/lib/admin/auditLog";
import { requireRootActor } from "@/lib/admin/getRootActor";
import {
  countTicketsForProviderEvents,
  listEventPaymentsForProvider,
  listProviderAuditLogs,
  loadProviderEvents,
  loadProviderSubscriptionOrders,
  resolveProviderForUser,
} from "@/lib/admin/providerDetail";
import { getUserById } from "@/lib/admin/users";

export const dynamic = "force-dynamic";

/**
 * Data export for a comercio (offboarding / portability). Returns one JSON file
 * with the account, comercio, team, events, payments, subscription orders and
 * audit trail. Root-actor only; the export itself is audited.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const caller = await requireRootActor();
  const { userId } = await params;

  const providerUser = await getUserById(userId);
  if (!providerUser || providerUser.role !== "provider") {
    return new Response("No encontrado", { status: 404 });
  }

  const { provider, members } = await resolveProviderForUser(userId);
  const providerId = provider?.id ?? null;

  const [events, subscriptionOrders, eventPayments, ticketStats, auditLogs] =
    await Promise.all([
      providerId
        ? loadProviderEvents(providerId)
        : Promise.resolve({ total: 0, items: [] }),
      loadProviderSubscriptionOrders(userId),
      providerId
        ? listEventPaymentsForProvider(providerId)
        : Promise.resolve([]),
      providerId
        ? countTicketsForProviderEvents(providerId)
        : Promise.resolve({ total: 0, active: 0 }),
      listProviderAuditLogs(userId, providerId),
    ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    exportedBy: caller.email,
    account: {
      id: providerUser.id,
      email: providerUser.email,
      fullName: providerUser.fullName,
      providerStatus: providerUser.providerStatus ?? null,
      subscriptionPlan: providerUser.subscriptionPlan ?? null,
      subscriptionStatus: providerUser.subscriptionStatus ?? null,
      freeTrialEnd: providerUser.freeTrialEnd ?? null,
      subscriptionPeriodEnd: providerUser.subscriptionPeriodEnd ?? null,
      createdAt: providerUser.createdAt,
      lastSignInAt: providerUser.lastSignInAt,
    },
    comercio: provider,
    members,
    ticketStats,
    events: events.items,
    eventPayments,
    subscriptionOrders,
    auditLogs,
  };

  await logAdminAudit({
    actor_user_id: caller.userId,
    actor_email: caller.email,
    source: "route_handler",
    action: "provider.data_export",
    resource_type: "provider_user",
    resource_id: userId,
    outcome: "success",
    state_after: {
      events: events.items.length,
      subscriptionOrders: subscriptionOrders.length,
      members: members.length,
    },
  });

  const slug = (provider?.handle ?? providerUser.email.split("@")[0]).replace(
    /[^a-z0-9_-]+/gi,
    "-",
  );
  const filename = `comercio-${slug}-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
    },
  });
}
