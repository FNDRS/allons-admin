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

/**
 * `??` would let an empty string through, and the Dockerfile always defines
 * these as ENV even when the build arg is absent. That is how a build with no
 * Sentry args would end up reporting into environment `""` at a sample rate of
 * `Number("") === 0` — tracing silently off, at the documented default.
 */
function envText(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function envRate(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw?.trim());
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1
    ? parsed
    : fallback;
}

export const sentryBaseOptions = {
  dsn: SENTRY_DSN,
  environment:
    envText(
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
      process.env.NODE_ENV,
    ) ?? "development",
  tracesSampleRate: envRate(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    0.1,
  ),
  // This panel handles comercio emails, contracts and payment payloads.
  sendDefaultPii: false,
  // The DSN can be shared with the API and the app, so tag the source.
  initialScope: { tags: { service: "allons-admin" } },
};
