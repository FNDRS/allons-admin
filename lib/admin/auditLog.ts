import { randomUUID } from "crypto";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type AuditOutcome = "success" | "failure";

/**
 * Contrato estable para Finanzas / controles internos — mantener nomenclatura
 * `dominio.verbo_detalle`. Ver docs/admin-audit-log.md .
 */
export type AdminAuditAction =
  | "auth.user_suspend"
  | "auth.user_unsuspend"
  | "provider.status_change"
  | "event.status_patch"
  | "waitlist_qr.source_upsert"
  | "waitlist_qr.source_delete";

export type AdminAuditInsert = Readonly<{
  actor_user_id?: string | null;
  actor_email?: string | null;
  /** server_action | route_handler */
  source: "server_action" | "route_handler";
  action: AdminAuditAction;
  /** Recurso lógico: user, event, waitlist_source, … */
  resource_type: string;
  resource_id: string;
  outcome: AuditOutcome;

  http_method?: string | null;
  http_path?: string | null;

  ip_address?: string | null;
  user_agent?: string | null;

  correlation_id?: string | null;
  client_request_id?: string | null;

  error_code?: string | null;
  error_message?: string | null;

  state_before?: Record<string, unknown> | null;
  state_after?: Record<string, unknown> | null;
}>;

export function peekClientProbeFromHeaders(h: Headers) {
  const forwarded = h.get("x-forwarded-for");
  const candidate =
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip")?.trim() ||
    null;
  return {
    ip_address: candidate,
    user_agent: h.get("user-agent"),
    client_request_id: h.get("x-request-id"),
  };
}

/**
 * Persiste línea en `admin_audit_logs`. No lanza errores bloqueantes al usuario:
 * errores sólo pasan por consola (la operación principal no debe revertir si falla auditoría).
 */
export async function logAdminAudit(insert: AdminAuditInsert): Promise<void> {
  const row = {
    actor_user_id: insert.actor_user_id ?? null,
    actor_email: insert.actor_email ?? null,
    source: insert.source,
    action: insert.action,
    resource_type: insert.resource_type,
    resource_id: insert.resource_id,
    outcome: insert.outcome,
    http_method: insert.http_method ?? null,
    http_path: insert.http_path ?? null,
    ip_address: insert.ip_address ?? null,
    user_agent: insert.user_agent ?? null,
    correlation_id: insert.correlation_id ?? randomUUID(),
    client_request_id: insert.client_request_id ?? null,
    error_code: insert.error_code ?? null,
    error_message: insert.error_message ?? null,
    state_before:
      insert.state_before === null || insert.state_before === undefined
        ? {}
        : insert.state_before,
    state_after:
      insert.state_after === null || insert.state_after === undefined
        ? {}
        : insert.state_after,
  };

  try {
    const supabase = createSupabaseServiceRoleClient();
    const { error } = await supabase.from("admin_audit_logs").insert(row);

    // PGRST205 / 42P01: tabla pendiente hasta aplicar migraciones Prisma en allons-api.
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") {
        console.warn(
          "[audit] admin_audit_logs no existe — en allons-api ejecutar prisma migrate deploy.",
        );
        return;
      }
      console.error("[audit] insert falló:", error.code, error.message);
    }
  } catch (e) {
    console.error("[audit] insert excepción:", e);
  }
}
