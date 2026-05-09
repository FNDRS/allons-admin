import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  delta?: { value: string; positive: boolean };
  icon?: LucideIcon;
  accent?: "primary" | "info" | "success" | "violet" | "warning";
}

const ACCENTS = {
  primary: { text: "text-primary", bg: "bg-primary/15" },
  info: { text: "text-info", bg: "bg-info/15" },
  success: { text: "text-success", bg: "bg-success/15" },
  violet: { text: "text-violet", bg: "bg-violet/15" },
  warning: { text: "text-warning", bg: "bg-warning/15" },
} as const;

export function KpiCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  accent = "primary",
}: Props) {
  const accentStyles = ACCENTS[accent];
  return (
    <div className="rounded-2xl border border-white/5 bg-surface p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs text-muted">{label}</div>
        {Icon ? (
          <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${accentStyles.bg}`}>
            <Icon size={14} className={accentStyles.text} />
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-bold leading-none">{value}</div>
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        {delta ? (
          <span
            className={
              delta.positive ? "text-success font-semibold" : "text-danger font-semibold"
            }
          >
            {delta.positive ? "▲" : "▼"} {delta.value}
          </span>
        ) : null}
        {hint ? <span className="text-muted">{hint}</span> : null}
      </div>
    </div>
  );
}
