import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  delta?: { value: string; positive: boolean };
  icon?: LucideIcon;
  compact?: boolean;
}

export function KpiCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  compact = false,
}: Props) {
  return (
    <div className={compact ? "futuristic-panel px-3 py-2.5" : "futuristic-panel p-5"}>
      <div className="flex items-start justify-between gap-2">
        <div className="eyebrow">{label}</div>
        {Icon ? (
          <div
            className={
              compact
                ? "flex h-5 w-5 items-center justify-center border border-white/15"
                : "flex h-7 w-7 items-center justify-center border border-white/15"
            }
          >
            <Icon size={compact ? 11 : 13} />
          </div>
        ) : null}
      </div>
      <div
        className={
          compact
            ? "mt-1 text-lg font-bold leading-none tracking-tight"
            : "mt-3 text-3xl font-bold leading-none tracking-tight"
        }
      >
        {value}
      </div>
      <div
        className={
          compact
            ? "mt-1 flex items-center gap-2 text-[10px]"
            : "mt-2 flex items-center gap-2 text-[11px]"
        }
      >
        {delta ? (
          <span
            className={
              delta.positive
                ? "inline-flex items-center gap-0.5 text-success font-semibold"
                : "inline-flex items-center gap-0.5 text-danger font-semibold"
            }
          >
            {delta.positive ? <ArrowUp size={11} /> : <ArrowDown size={11} />}{" "}
            {delta.value}
          </span>
        ) : null}
        {hint ? <span className="text-muted">{hint}</span> : null}
      </div>
    </div>
  );
}
