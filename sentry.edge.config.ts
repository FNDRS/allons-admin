import * as Sentry from "@sentry/nextjs";
import { isSentryConfigured, sentryBaseOptions } from "./sentry.shared";

if (isSentryConfigured) {
  Sentry.init(sentryBaseOptions);
}
