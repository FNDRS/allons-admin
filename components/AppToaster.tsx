"use client";

import { Toaster } from "sonner";

export function AppToaster() {
  return (
    <Toaster
      theme="dark"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "futuristic-panel border border-white/15 bg-[#0a0a0a] text-white shadow-none",
          title: "text-sm font-semibold",
          description: "text-sm text-white/70",
          error: "border-danger/40 bg-danger/10 text-white",
        },
      }}
    />
  );
}
