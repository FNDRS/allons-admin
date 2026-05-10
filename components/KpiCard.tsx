import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  delta?: { value: string; positive: boolean };
  icon?: LucideIcon;
}

export function KpiCard({ label, value, hint, delta, icon: Icon }: Props) {
  return (
    <div className="futuristic-panel p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="eyebrow">{label}</div>
        {Icon ? (
          <div className="flex h-7 w-7 items-center justify-center border border-white/15">
            <Icon size={13} />
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-3xl font-bold leading-none tracking-tight">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        {delta ? (
          <span
            className={
              delta.positive
                ? "text-success font-semibold"
                : "text-danger font-semibold"
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
