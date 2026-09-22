import "server-only";

import { adminFetch, type AdminApiActor } from "@/lib/admin/adminFetch";
import type { ProviderStatus } from "@/lib/admin/usersApi";

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

export interface ProviderOption {
  id: string;
  name: string;
  handle: string | null;
}

export type ProviderPlanValue =
  | "pendiente"
  | "single_event"
  | "basico"
  | "pro";

export type ResendInviteResult =
  | { outcome: "missing_email" }
  | { outcome: "already_confirmed" }
  | { outcome: "sent"; email: string }
  | { outcome: "failed"; email: string; error: string };

export interface CreateComercioPayload {
  fullName: string;
  email: string;
  phone: string | null;
  brandName: string;
  brandHandle: string;
  brandDescription: string | null;
  websiteUrl: string | null;
  businessType: string;
  brandColor: string;
  pasarelaFeePct: string;
  allonsFeePct: string;
  logoUrl: string | null;
  contractUrl: string | null;
}

export function getProviderDetail(userId: string) {
  return adminFetch<{
    provider: ProviderDbRow | null;
    members: ProviderMemberRow[];
  }>(`/admin/providers/by-user/${encodeURIComponent(userId)}`, {
    method: "GET",
  });
}

export function getProviderOwnerUserId(providerId: string) {
  return adminFetch<{ userId: string | null }>(
    `/admin/providers/${encodeURIComponent(providerId)}/owner`,
    { method: "GET" },
  );
}

export function listProviderOptionsApi() {
  return adminFetch<{ items: ProviderOption[] }>("/admin/providers/options", {
    method: "GET",
  });
}

export function listProviderEventPayments(providerId: string) {
  return adminFetch<{ items: ProviderEventPaymentRow[] }>(
    `/admin/providers/${encodeURIComponent(providerId)}/payments`,
    { method: "GET" },
  );
}

export function getProviderTicketStats(providerId: string) {
  return adminFetch<ProviderTicketStats>(
    `/admin/providers/${encodeURIComponent(providerId)}/ticket-stats`,
    { method: "GET" },
  );
}

export function setProviderStatusApi(
  userId: string,
  status: ProviderStatus,
  actor: AdminApiActor,
) {
  return adminFetch<{ ok: true; status: ProviderStatus }>(
    `/admin/providers/by-user/${encodeURIComponent(userId)}/status`,
    { method: "PATCH", body: { status }, actor, source: "server_action" },
  );
}

export function setProviderFeesApi(
  userId: string,
  fees: { pasarelaFeePct: string | number; allonsFeePct: string | number },
  actor: AdminApiActor,
) {
  return adminFetch<{
    ok: true;
    pasarelaFeePct: number;
    allonsFeePct: number;
  }>(`/admin/providers/by-user/${encodeURIComponent(userId)}/fees`, {
    method: "PATCH",
    body: fees,
    actor,
    source: "server_action",
  });
}

export function resendProviderInviteApi(
  userId: string,
  actor: AdminApiActor,
) {
  return adminFetch<ResendInviteResult>(
    `/admin/providers/by-user/${encodeURIComponent(userId)}/invite/resend`,
    { method: "POST", actor, source: "server_action" },
  );
}

export function createComercioApi(
  payload: CreateComercioPayload,
  actor: AdminApiActor,
) {
  return adminFetch<{
    ok: true;
    userId: string;
    providerId: string;
    brandName: string;
    invite: "invited" | "existing";
  }>("/admin/providers", {
    method: "POST",
    body: payload,
    actor,
    source: "server_action",
  });
}
