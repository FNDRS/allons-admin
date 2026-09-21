import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

/**
 * Server Components, Server Actions and route handlers throw far from any
 * error boundary; without this hook those failures never reach Sentry, which
 * is precisely where this panel's writes live.
 */
export const onRequestError = Sentry.captureRequestError;
