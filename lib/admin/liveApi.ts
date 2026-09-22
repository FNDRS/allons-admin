export interface LiveSchedule {
  id: string;
  name: string;
  priceCents: number;
  sold: number;
  total: number;
  remaining: number | null;
  grossCents: number;
}

export interface LiveOrder {
  orderId: string;
  at: string;
  status: string;
  userId: string;
  buyerName: string | null;
  scheduleName: string | null;
  quantity: number;
  amountCents: number;
  method: "saved_card" | "link";
  origin: string | null;
}

export interface LiveSnapshot {
  generatedAt: string;
  windowHours: number;
  pulse: {
    paidCount: number;
    grossCents: number;
    ticketsIssued: number;
    pendingCount: number;
    pendingCents: number;
    failedCount: number;
    conversionPct: number | null;
    avgTicketCents: number | null;
  };
  schedules: LiveSchedule[];
  recent: LiveOrder[];
  attention: {
    paidWithoutTickets: Array<{
      orderId: string;
      at: string;
      amountCents: number;
      buyerName: string | null;
    }>;
    declines: Array<{
      at: string;
      amountCents: number;
      buyerName: string | null;
      reason: string | null;
    }>;
    expiredPending: number;
  };
  bySource: Record<string, number>;
  lastHour: Array<{ minute: string; count: number; grossCents: number }>;
}

/** Del navegador: pasa por el proxy, que es quien tiene el secreto. */
export async function fetchLiveSnapshot(
  eventId?: string,
): Promise<LiveSnapshot> {
  const search = new URLSearchParams();
  if (eventId) search.set("eventId", eventId);
  const res = await fetch(`/api/admin/live?${search.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`live failed (${res.status})`);
  return (await res.json()) as LiveSnapshot;
}
