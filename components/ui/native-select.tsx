import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "h-9 w-full appearance-none rounded-md border border-white/15 bg-white/4 py-2 pl-3 pr-8 text-sm text-white transition-colors focus-visible:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/40"
        aria-hidden
      />
    </div>
  );
}

export { NativeSelect };
