export type AdminNotificationAudience = "clients" | "providers";
export type AdminNotificationTab = "amigos" | "eventos" | "menciones";

export interface BroadcastNotificationInput {
  audience: AdminNotificationAudience;
  categoryLabel?: string | null;
  title: string;
  description?: string | null;
  tabs: AdminNotificationTab[];
  dedupeKey?: string | null;
}

export async function broadcastNotification(input: BroadcastNotificationInput) {
  const res = await fetch("/api/admin/notifications/broadcast", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to broadcast notification (${res.status})`);
  }
  return (await res.json()) as { ok: true };
}
