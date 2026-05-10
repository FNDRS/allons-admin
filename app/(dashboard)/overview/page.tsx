export default function OverviewPage() {
  return (
    <div className="futuristic-panel p-6">
      <h1 className="text-xl font-bold">Overview</h1>
      <p className="mt-2 text-sm text-muted max-w-2xl">
        Panel listo. Puedes navegar a <span className="text-white">Waitlist QR</span>{" "}
        para crear y rastrear fuentes por código QR.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="border border-white/15 bg-surfaceMuted/40 p-4">
          <div className="eyebrow">Estado</div>
          <div className="mt-1 text-lg font-semibold">Operativo</div>
        </div>
        <div className="border border-white/15 bg-surfaceMuted/40 p-4">
          <div className="eyebrow">Módulo nuevo</div>
          <div className="mt-1 text-lg font-semibold">Waitlist QR</div>
        </div>
        <div className="border border-white/15 bg-surfaceMuted/40 p-4">
          <div className="eyebrow">Acceso</div>
          <div className="mt-1 text-lg font-semibold">Solo root admins</div>
        </div>
      </div>
    </div>
  );
}
