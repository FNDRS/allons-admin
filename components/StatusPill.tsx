type Variant = "success" | "warning" | "danger" | "info" | "muted" | "primary";

const VARIANTS: Record<Variant, string> = {
  success: "border-success/40 text-success",
  warning: "border-warning/40 text-warning",
  danger: "border-danger/40 text-danger",
  info: "border-info/40 text-info",
  muted: "border-white/15 text-muted",
  primary: "border-white/30 text-white",
};

export function StatusPill({
  label,
  variant = "muted",
}: {
  label: string;
  variant?: Variant;
}) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${VARIANTS[variant]}`}
    >
      {label}
    </span>
  );
}
