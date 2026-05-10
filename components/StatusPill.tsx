type Variant = "success" | "warning" | "danger" | "info" | "muted" | "primary";

const VARIANTS: Record<Variant, { bg: string; text: string }> = {
  success: { bg: "bg-success/15", text: "text-success" },
  warning: { bg: "bg-warning/15", text: "text-warning" },
  danger: { bg: "bg-danger/15", text: "text-danger" },
  info: { bg: "bg-info/15", text: "text-info" },
  muted: { bg: "bg-white/5", text: "text-muted" },
  primary: { bg: "bg-primary/15", text: "text-primary" },
};

export function StatusPill({
  label,
  variant = "muted",
}: {
  label: string;
  variant?: Variant;
}) {
  const styles = VARIANTS[variant];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${styles.bg} ${styles.text}`}
    >
      {label}
    </span>
  );
}
