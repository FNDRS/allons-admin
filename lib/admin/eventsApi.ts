/**
 * Event endpoints of `allons-api`, as the panel sees them.
 *
 * The transport lives in `adminFetch.ts`; this file is only the event shapes
 * and calls.
 */
import {
  adminApiErrorMessage as _adminApiErrorMessage,
  adminFetch,
  type AdminApiActor,
} from "@/lib/admin/adminFetch";
import { FEE_QUOTE_MODES } from "@/lib/admin/feeQuote";
import type {
  AdminEventFeeConfig,
  AdminEventFeeOverrides,
} from "@/lib/admin/eventFeeConfig";

export { type AdminApiActor };

/** Re-exported so existing callers keep one import for a call and its error. */
export const adminApiErrorMessage = _adminApiErrorMessage;

export interface AdminEventListItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  eventType: string;
  recurrence: string | null;
  startsAt: string | null;
  endsAt: string | null;
  city: string | null;
  venue: string | null;
  themeColor: string | null;
  capacity: number;
  ticketMode: string;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string | null;
    name: string | null;
    handle: string | null;
  } | null;
}

export interface AdminEventDetailItem extends AdminEventListItem {
  providerId: string | null;
  address: string | null;
  coverImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  smokingAllowed: boolean;
  petFriendly: boolean;
  parkingAvailable: boolean;
  minAge: number | null;
  /** Dónde se recoge el kit; vacío si el evento no entrega nada. */
  kitPickupInfo: string | null;
  /** Interés con el que se descubre el evento. Null si todavía no tiene. */
  category: string | null;
  /** Galería, en orden. La portada va aparte, en `coverImageUrl`. */
  galleryUrls: string[];
}

export interface AdminEventListResponse {
  total: number;
  items: AdminEventListItem[];
}

export interface AdminEventListFilters {
  q?: string;
  status?: string;
  city?: string;
  providerId?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export interface AdminOverviewMetricsResponse {
  activeEvents: number;
  tickets30d: number;
  posthogErrors30d?: number | null;
  gmv30d?: number | null;
  totalEvents?: number;
}

export interface AdminPlatformStatusResponse {
  adminAuditLogsReady: boolean;
  paygate: {
    configured: boolean;
    connectivityStatus: string;
  };
  massSignupAlerts: {
    mode: "cron";
    enabled: boolean;
    windowMinutes: number;
    threshold: number;
    cooldownMinutes: number;
    cron: string;
    recipientsConfigured: boolean;
    resendConfigured: boolean;
  };
}

const ALLOWED_STATUSES = [
  "draft",
  "published",
  "sold_out",
  "ended",
  "suspended",
] as const;
export type AdminEventStatus = (typeof ALLOWED_STATUSES)[number];

export function listAdminEvents(filters: AdminEventListFilters = {}) {
  return adminFetch<AdminEventListResponse>("/admin/events", {
    method: "GET",
    params: {
      q: filters.q,
      status: filters.status,
      city: filters.city,
      providerId: filters.providerId,
      from: filters.from,
      to: filters.to,
      limit: filters.limit,
    },
  });
}

export function getAdminEvent(id: string) {
  return adminFetch<AdminEventDetailItem>(
    `/admin/events/${encodeURIComponent(id)}`,
    { method: "GET" },
  );
}

export interface AdminEventFormField {
  id: string;
  label: string;
  kind: string;
  options: string[];
  required: boolean;
  sortOrder: number;
}

export interface AdminEventForm {
  eventId: string;
  fields: AdminEventFormField[];
}

export interface AdminEventRegistrationAnswer {
  questionId: string;
  label: string;
  answer: string;
}

export interface AdminEventRegistration {
  id: string;
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  answers: AdminEventRegistrationAnswer[];
  createdAt: string;
}

export function isFreeWebRegistration(
  event: Pick<AdminEventListItem, "ticketMode">,
) {
  return event.ticketMode === "free";
}

export function getAdminEventForm(eventId: string) {
  return adminFetch<AdminEventForm>(
    `/admin/events/${encodeURIComponent(eventId)}/form`,
    { method: "GET" },
  );
}

export function saveAdminEventForm(
  eventId: string,
  fields: AdminEventFormField[],
) {
  return adminFetch<AdminEventForm>(
    `/admin/events/${encodeURIComponent(eventId)}/form`,
    { method: "PUT", body: { fields } },
  );
}

export function listAdminEventRegistrations(eventId: string) {
  return adminFetch<{ items: AdminEventRegistration[] }>(
    `/admin/events/${encodeURIComponent(eventId)}/registrations`,
    { method: "GET" },
  );
}

export function createAdminEventRegistration(
  eventId: string,
  body: {
    attendeeName: string;
    attendeeEmail: string;
    answers: AdminEventRegistrationAnswer[];
  },
) {
  return adminFetch<AdminEventRegistration>(
    `/admin/events/${encodeURIComponent(eventId)}/registrations`,
    { method: "POST", body },
  );
}

export function updateAdminEventStatus(
  id: string,
  status: AdminEventStatus,
  actor: AdminApiActor,
) {
  return adminFetch<{ ok: true; id: string; status: string }>(
    `/admin/events/${encodeURIComponent(id)}/status`,
    { method: "PATCH", body: { status }, actor, source: "server_action" },
  );
}

export function getAdminOverviewMetrics() {
  return adminFetch<AdminOverviewMetricsResponse>("/admin/overview-metrics", {
    method: "GET",
  });
}

export function getAdminPlatformStatus() {
  return adminFetch<AdminPlatformStatusResponse>("/admin/platform-status", {
    method: "GET",
  });
}

// Cached variants - 30s ISR. Overview metrics are 3 Prisma counts + Paygate
// health; without cache every navigation pays ~50-150ms (local) or 300-600ms
// (cross-region prod) for data that changes slowly. Pages keep
// `dynamic = "force-dynamic"` (auth gate) but data is stale-while-revalidate.
import { unstable_cache as _unstable_cache } from "next/cache";

export const getAdminOverviewMetricsCached = _unstable_cache(
  getAdminOverviewMetrics,
  ["admin:overview-metrics-v1"],
  { revalidate: 30, tags: ["admin-overview"] },
);

export const getAdminPlatformStatusCached = _unstable_cache(
  getAdminPlatformStatus,
  ["admin:platform-status-v1"],
  { revalidate: 30, tags: ["admin-platform"] },
);

export function isValidAdminEventStatus(
  value: string,
): value is AdminEventStatus {
  return (ALLOWED_STATUSES as readonly string[]).includes(value);
}

export interface AdminEventTicketTypeRow {
  id: string;
  name: string;
  price: number;
  total: number;
  soldCount: number;
  active: boolean;
  /** Null en un tier gratis; la API las exige en cuanto el precio es mayor a cero. */
  saleStartsAt: string | null;
  saleEndsAt: string | null;
}

export interface AdminEventTicketStats {
  total: number;
  active: number;
}

export interface CreateAdminEventPayload {
  providerId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  city: string | null;
  venue: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  capacity: number;
  status: "draft" | "published";
  themeColor: string;
  category: string;
  kitPickupInfo: string | null;
  refundPolicy: "none" | "partial" | "full";
  refundPartialPct: number | null;
  refundDeadlineDays: number | null;
  ticketTypes: Array<{
    name: string;
    kind: "general" | "vip";
    price: number;
    total: number;
    saleStartsAt: string | null;
    saleEndsAt: string | null;
    donationEnabled: boolean;
  }>;
  /** Already uploaded; the first becomes the cover, the rest the gallery. */
  imageUrls: string[];
  formFields: AdminEventFormField[];
}

export interface UpdateAdminEventPayload {
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  city: string | null;
  venue: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  capacity: number;
  themeColor: string;
  category: string;
  imageUrls: string[];
}

export function updateAdminEvent(
  eventId: string,
  payload: UpdateAdminEventPayload,
  actor: AdminApiActor,
) {
  return adminFetch<{ ok: true; eventId: string; title: string }>(
    `/admin/events/${encodeURIComponent(eventId)}`,
    { method: "PATCH", body: payload, actor, source: "server_action" },
  );
}

export function createAdminEvent(
  payload: CreateAdminEventPayload,
  actor: AdminApiActor,
) {
  return adminFetch<{
    ok: true;
    eventId: string;
    title: string;
    published: boolean;
  }>("/admin/events", {
    method: "POST",
    body: payload,
    actor,
    source: "server_action",
  });
}

export function setAdminEventKitPickup(
  eventId: string,
  kitPickupInfo: string,
  actor: AdminApiActor,
) {
  return adminFetch<{ ok: true; hasKitPickupInfo: boolean }>(
    `/admin/events/${encodeURIComponent(eventId)}/kit-pickup`,
    {
      method: "PATCH",
      body: { kitPickupInfo },
      actor,
      source: "server_action",
    },
  );
}

export interface AdminTicketTypePatch {
  name: string;
  priceCents: number;
  total: number;
  active: boolean;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
}

export interface AdminTicketTypePatchResult {
  row: AdminEventTicketTypeRow;
  /** Se aplico igual, pero hay que decirlo: precio movido con ventas, por ejemplo. */
  warnings: string[];
}

export function patchAdminEventTicketType(
  eventId: string,
  ticketTypeId: string,
  body: AdminTicketTypePatch,
  actor: AdminApiActor,
) {
  return adminFetch<AdminTicketTypePatchResult>(
    `/admin/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(ticketTypeId)}`,
    { method: "PATCH", body, actor, source: "server_action" },
  );
}

export type { FeeQuoteMode as AdminFeeMode } from "@/lib/admin/feeQuote";
export type {
  AdminEventFeeConfig,
  AdminEventFeeOverrides,
  AdminEventFeeQuote,
} from "@/lib/admin/eventFeeConfig";
export const ADMIN_FEE_MODES = FEE_QUOTE_MODES;

export function getAdminEventFees(eventId: string, previewCents?: number) {
  const query =
    typeof previewCents === "number" && previewCents > 0
      ? `?previewCents=${Math.round(previewCents)}`
      : "";
  return adminFetch<AdminEventFeeConfig>(
    `/admin/events/${encodeURIComponent(eventId)}/fees${query}`,
    { method: "GET" },
  );
}

/**
 * Guarda los overrides. Se manda el objeto completo con nulls explícitos: un
 * null limpia el override y devuelve ese campo al valor del comercio, que es
 * la única forma de deshacerlo.
 */
export function setAdminEventFees(
  eventId: string,
  overrides: AdminEventFeeOverrides,
  actor: AdminApiActor,
) {
  return adminFetch<AdminEventFeeConfig>(
    `/admin/events/${encodeURIComponent(eventId)}/fees`,
    { method: "PATCH", body: overrides, actor, source: "server_action" },
  );
}

export function getAdminEventTicketStats(eventId: string) {
  return adminFetch<AdminEventTicketStats>(
    `/admin/events/${encodeURIComponent(eventId)}/ticket-stats`,
    { method: "GET" },
  );
}

export function listAdminEventTicketTypes(eventId: string) {
  return adminFetch<{ items: AdminEventTicketTypeRow[] }>(
    `/admin/events/${encodeURIComponent(eventId)}/ticket-types`,
    { method: "GET" },
  );
}
