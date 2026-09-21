import "server-only";

import { adminFetch, type AdminApiActor } from "@/lib/admin/adminFetch";

export interface WaitlistQrSource {
  slug: string;
  label: string;
  location: string | null;
  notes: string | null;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistQrStat {
  source: string;
  total: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
}

export interface WaitlistQrOverview {
  setupRequired: boolean;
  setupHints: {
    sourcesTableMissing: boolean;
    statsViewMissing: boolean;
  };
  sources: WaitlistQrSource[];
  stats: WaitlistQrStat[];
  directCount: number;
  discoveredSources: string[];
}

export interface WaitlistPerson {
  email: string;
  createdAt: string;
  referer: string | null;
  ip: string | null;
}

export function getWaitlistQrOverview() {
  return adminFetch<WaitlistQrOverview>("/admin/waitlist-qr/sources", {
    method: "GET",
  });
}

export function getWaitlistQrSource(slug: string) {
  return adminFetch<{ source: WaitlistQrSource | null; people: WaitlistPerson[] }>(
    `/admin/waitlist-qr/sources/${encodeURIComponent(slug)}`,
    { method: "GET" },
  );
}

export function upsertWaitlistQrSource(
  slug: string,
  body: {
    label: string;
    location: string | null;
    notes: string | null;
    isActive: boolean;
  },
  actor: AdminApiActor,
) {
  return adminFetch<{ source: WaitlistQrSource }>(
    `/admin/waitlist-qr/sources/${encodeURIComponent(slug)}`,
    { method: "PUT", body, actor },
  );
}

export function deleteWaitlistQrSource(slug: string, actor: AdminApiActor) {
  return adminFetch<{ ok: true }>(
    `/admin/waitlist-qr/sources/${encodeURIComponent(slug)}`,
    { method: "DELETE", actor },
  );
}
