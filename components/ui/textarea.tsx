import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-md border border-white/15 bg-white/4 px-3 py-2 text-sm text-white placeholder:text-white/30 transition-colors focus-visible:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
