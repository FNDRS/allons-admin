type Variant = "success" | "warning" | "danger" | "info" | "muted" | "primary";

const VARIANTS: Record<Variant, string> = {
  success: "border-[#34B013]/60 bg-[#34B013]/20 text-[#34B013]",
  warning: "border-[#FFBE0B]/60 bg-[#FFBE0B]/20 text-[#FFBE0B]",
  danger: "border-[#CE0F0F]/60 bg-[#CE0F0F]/20 text-[#FF6B6B]",
  info: "border-[#3A86FF]/60 bg-[#3A86FF]/20 text-[#3A86FF]",
  muted: "border-white/20 bg-white/10 text-muted",
  primary: "border-white/40 bg-white/15 text-white",
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
