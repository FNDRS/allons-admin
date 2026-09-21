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

export type AdminFeeMode =
  "provider_absorbs" | "buyer_pays_gateway" | "buyer_pays_all";

export const ADMIN_FEE_MODES: ReadonlyArray<{
  value: AdminFeeMode;
  label: string;
  hint: string;
}> = [
  {
    value: "provider_absorbs",
    label: "El comercio absorbe todo",
    hint: "El comprador paga el precio publicado. Al comercio se le descuentan la comisión y la pasarela.",
  },
  {
    value: "buyer_pays_gateway",
    label: "El comprador paga la pasarela",
    hint: "Se suma un cargo por servicio al precio. Al comercio solo se le descuenta la comisión de Allons.",
  },
  {
    value: "buyer_pays_all",
    label: "El comprador paga todo",
    hint: "El comercio recibe el precio del boleto íntegro. El comprador cubre la pasarela y la comisión.",
  },
];

/** Overrides del evento. Null en cualquiera significa «usar el del comercio». */
export interface AdminEventFeeOverrides {
  feeMode: AdminFeeMode | null;
  allonsFeePct: number | null;
  gatewayFeePct: number | null;
  gatewayFixedCents: number | null;
  isvPct: number | null;
}

/** Desglose de un boleto de muestra, calculado por la API. */
export interface AdminEventFeeQuote {
  feeMode: AdminFeeMode;
  subtotalCents: number;
  serviceChargeCents: number;
  totalCents: number;
  gatewayCostCents: number;
  allonsFeeCents: number;
  isvCents: number;
  providerNetCents: number;
  roundingCents: number;
}

export interface AdminEventFeeConfig {
  eventId: string;
  /** False mientras el cobro real no lea esta configuración. */
  appliesToCheckout?: boolean;
  overrides: AdminEventFeeOverrides;
  providerDefaults: { allonsFee: number; pasarelaFee: number };
  effective: {
    feeMode: AdminFeeMode;
    allonsFeePct: number;
    gatewayRatePct: number;
    gatewayFixedCents: number;
    isvPct: number;
  };
  preview: AdminEventFeeQuote;
}

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
