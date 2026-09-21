import "server-only";

import { adminFetch, type AdminApiActor } from "@/lib/admin/adminFetch";

/**
 * Reading the panel's audit trail.
 *
 * Nothing here writes a mutation's audit row any more: `allons-api` records it
 * inside the endpoint that performs the change, so a screen cannot forget to.
 * The one exception is `recordAdminAudit`, for what happens entirely in this
 * app and leaves no trace there - today, a comercio data export.
 */
export interface AdminAuditRow {
  id: string;
  occurredAt: string;
  action: string;
  outcome: string;
  actorEmail: string | null;
  actorUserId: string | null;
  resourceType: string;
  resourceId: string;
  stateBefore: Record<string, unknown>;
  stateAfter: Record<string, unknown>;
  errorMessage: string | null;
}

export interface ListAdminAuditFilters {
  /** One or more resource ids; the API matches any of them. */
  resourceIds?: string[];
  resourceType?: string;
  actionPrefix?: string;
  limit?: number;
}

export async function listAdminAudit(
  filters: ListAdminAuditFilters = {},
): Promise<AdminAuditRow[]> {
  try {
    const data = await adminFetch<{ items: AdminAuditRow[] }>("/admin/audit", {
      method: "GET",
      params: {
        resourceId: filters.resourceIds?.join(","),
        resourceType: filters.resourceType,
        actionPrefix: filters.actionPrefix,
        limit: filters.limit,
      },
    });
    return data.items;
  } catch (error) {
    // The trail is context, not the page. A screen that can still show the
    // comercio is more useful than one that 500s because the log is down.
    console.warn("[audit] list failed:", error);
    return [];
  }
}

export async function recordAdminAudit(
  entry: {
    action: "provider.data_export";
    resourceType: string;
    resourceId: string;
    outcome?: "success" | "failure";
    stateAfter?: Record<string, unknown>;
    errorMessage?: string | null;
  },
  actor: AdminApiActor,
): Promise<void> {
  try {
    await adminFetch("/admin/audit", {
      method: "POST",
      body: entry,
      actor,
      source: "route_handler",
    });
  } catch (error) {
    // Never block the operation the admin already saw succeed.
    console.error("[audit] record failed:", error);
  }
}
