/**
 * One place for the Sentry settings the three runtimes share.
 *
 * No DSN means no `init`, exactly like `src/instrument.ts` in allons-api: a
 * local or CI run stays quiet instead of failing or shipping noise, and the
 * panel works with Sentry unconfigured.
 *
 * Every variable read here is `NEXT_PUBLIC_`, because this file is imported by
 * `instrumentation-client.ts` too. A server-only name would be undefined in the
 * browser bundle, and the client would silently report into a different
 * environment than the server at a sampling rate nobody chose.
 */
export const SENTRY_DSN = (process.env.NEXT_PUBLIC_SENTRY_DSN ?? "").trim();

export const isSentryConfigured = Boolean(SENTRY_DSN);

export const sentryBaseOptions = {
  dsn: SENTRY_DSN,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ??
    process.env.NODE_ENV ??
    "development",
  tracesSampleRate: Number(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? "0.1",
  ),
  // This panel handles comercio emails, contracts and payment payloads.
  sendDefaultPii: false,
  // The DSN can be shared with the API and the app, so tag the source.
  initialScope: { tags: { service: "allons-admin" } },
};
