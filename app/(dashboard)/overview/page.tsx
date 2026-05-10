import { Activity, ShieldCheck, Sparkles } from "lucide-react";

export default function OverviewPage() {
  return (
    <div className="futuristic-panel p-6">
      <h1 className="text-xl font-bold">Overview</h1>
      <p className="mt-2 text-sm text-muted max-w-2xl">
        Panel listo. Puedes navegar a <span className="text-white">Waitlist QR</span>{" "}
        para crear y rastrear fuentes por código QR.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <OverviewCard
          label="Estado"
          value="Operativo"
          hint="Servicios clave funcionando"
          icon={<Activity size={16} />}
        />
        <OverviewCard
          label="Módulo nuevo"
          value="Waitlist QR"
          hint="Creación y tracking activos"
          icon={<Sparkles size={16} />}
        />
        <OverviewCard
          label="Acceso"
          value="Solo root admins"
          hint="Controlado por allowlist"
          icon={<ShieldCheck size={16} />}
        />
      </div>
    </div>
  );
}

function OverviewCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="border border-white/15 bg-surfaceMuted/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="eyebrow">{label}</div>
        <div className="text-white/80">{icon}</div>
      </div>
      <div className="mt-2 text-lg font-semibold leading-tight">{value}</div>
      <p className="mt-2 text-xs text-muted">{hint}</p>
    </article>
  );
}
