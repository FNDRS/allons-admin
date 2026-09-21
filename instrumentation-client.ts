import * as Sentry from "@sentry/nextjs";
import { isSentryConfigured, sentryBaseOptions } from "./sentry.shared";

if (isSentryConfigured) {
  Sentry.init({
    ...sentryBaseOptions,
    // Session replay is deliberately off: the panel's screens show comercio
    // contact data, contracts and payment detail.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
