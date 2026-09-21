"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Last resort: an error thrown in the root layout replaces the whole document,
 * so this is the only boundary that can still report it.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es-HN">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#131516",
          color: "#fbfbfb",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 700 }}>
            Algo se rompió
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: "22px", opacity: 0.7 }}>
            Ya lo reportamos. Recarga la página; si sigue igual, revisa Sentry.
          </p>
        </div>
      </body>
    </html>
  );
}
