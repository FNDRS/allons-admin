"use client";

import { WAITLIST_SOURCE_RE, normalizeSourceSlug } from "@/lib/waitlist-qr";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

interface SourceRow {
  slug: string;
  label: string;
  location: string | null;
  notes: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface SourceStatRow {
  source: string;
  total: number;
  first_seen_at: string | null;
  last_seen_at: string | null;
}

interface ApiPayload {
  setupRequired: boolean;
  setupHints: {
    sourcesTableMissing: boolean;
    statsViewMissing: boolean;
  };
  sources: SourceRow[];
  stats: SourceStatRow[];
  directCount: number;
  discoveredSources: string[];
}

interface ApiErrorPayload {
  error?: string;
  setupRequired?: boolean;
  setupHints?: {
    sourcesTableMissing?: boolean;
    statsViewMissing?: boolean;
  };
}

interface Props {
  waitlistBaseUrl: string;
}

function buildTrackingUrl(baseUrl: string, slug: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("src", slug);
  return url.toString();
}

function formatDate(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SourceQrCard({
  source,
  stats,
  waitlistBaseUrl,
}: {
  source: SourceRow;
  stats?: SourceStatRow;
  waitlistBaseUrl: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const trackingUrl = useMemo(
    () => buildTrackingUrl(waitlistBaseUrl, source.slug),
    [source.slug, waitlistBaseUrl],
  );

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(trackingUrl, {
      width: 420,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (mounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (mounted) setQrDataUrl(null);
      });
    return () => {
      mounted = false;
    };
  }, [trackingUrl]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <article className="futuristic-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{source.label}</h3>
          <p className="mt-1 text-xs text-muted">
            <span className="text-muted-weak">slug:</span> {source.slug}
            {source.location ? (
              <>
                {" "}
                · <span className="text-muted-weak">ubicación:</span>{" "}
                {source.location}
              </>
            ) : null}
          </p>
        </div>
        <span
          className={
            "border px-2 py-1 text-[10px] font-medium " +
            (source.is_active
              ? "border-success/35 bg-success/20 text-success"
              : "border-white/20 bg-white/10 text-muted")
          }
        >
          {source.is_active ? "Activo" : "Pausado"}
        </span>
      </div>

      {source.notes ? (
        <p className="mt-2 text-xs text-muted">{source.notes}</p>
      ) : null}

      <div className="mt-3 border border-white/10 bg-surfaceMuted/40 p-2 text-[11px] text-muted break-all">
        {trackingUrl}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
        <div className="border border-white/10 bg-surfaceMuted/40 p-2.5">
          <div className="eyebrow">
            Registros
          </div>
          <div className="mt-1 text-lg font-bold text-white">{stats?.total ?? 0}</div>
        </div>
        <div className="border border-white/10 bg-surfaceMuted/40 p-2.5">
          <div className="eyebrow">
            Último registro
          </div>
          <div className="mt-1 text-[11px] text-white">
            {formatDate(stats?.last_seen_at ?? null)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={copyUrl}
          className="border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium hover:bg-white/20"
        >
          {copied ? "Copiado" : "Copiar URL"}
        </button>
        <a
          href={qrDataUrl ?? "#"}
          download={`${source.slug}.png`}
          className={
            "border px-3 py-2 text-xs font-medium " +
            (qrDataUrl
              ? "border-white bg-white text-black hover:bg-white/90"
              : "border-white/20 bg-white/10 text-muted pointer-events-none")
          }
        >
          Descargar QR
        </a>
      </div>

      <div className="mt-3 flex justify-center border border-white/20 bg-white p-3">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt={`QR ${source.slug}`}
            className="h-40 w-40"
            loading="lazy"
          />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center text-xs text-black/60">
            Generando QR...
          </div>
        )}
      </div>
    </article>
  );
}

export function WaitlistQrManager({ waitlistBaseUrl }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [setupHints, setSetupHints] = useState<ApiPayload["setupHints"] | null>(
    null,
  );
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [stats, setStats] = useState<SourceStatRow[]>([]);
  const [directCount, setDirectCount] = useState(0);
  const [discovered, setDiscovered] = useState<string[]>([]);

  const [slug, setSlug] = useState("");
  const [label, setLabel] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist-qr-sources", { cache: "no-store" });
      const data = (await res.json()) as ApiPayload | ApiErrorPayload;
      if (!res.ok) {
        const message =
          (data as ApiErrorPayload).error ||
          (res.status === 401
            ? "No autorizado. Verifica que tu correo esté en ROOT_ADMIN_EMAILS."
            : "No se pudo cargar el módulo de Waitlist QR.");
        if ((data as ApiErrorPayload).setupRequired) {
          setSetupHints({
            sourcesTableMissing:
              Boolean((data as ApiErrorPayload).setupHints?.sourcesTableMissing),
            statsViewMissing:
              Boolean((data as ApiErrorPayload).setupHints?.statsViewMissing),
          });
        }
        throw new Error(message);
      }
      const okData = data as ApiPayload;
      setSources(okData.sources);
      setStats(okData.stats);
      setDirectCount(okData.directCount);
      setDiscovered(okData.discoveredSources);
      setSetupHints(okData.setupRequired ? okData.setupHints : null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const saveSource = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedSlug = normalizeSourceSlug(slug);
    if (!normalizedSlug || !WAITLIST_SOURCE_RE.test(normalizedSlug)) {
      setError(
        "Slug inválido. Usa letras, números, guiones o guion bajo (máx. 40).",
      );
      return;
    }
    if (!label.trim()) {
      setError("La etiqueta es obligatoria.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist-qr-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: normalizedSlug,
          label,
          location,
          notes,
          isActive: true,
        }),
      });

      const data = (await res.json()) as { source?: SourceRow; error?: string };
      if (!res.ok || !data.source) {
        throw new Error(data.error ?? "No se pudo guardar la fuente QR.");
      }

      setSources((current) => {
        const next = current.filter((entry) => entry.slug !== data.source!.slug);
        return [data.source!, ...next];
      });
      setSlug("");
      setLabel("");
      setLocation("");
      setNotes("");
      void loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la fuente QR.",
      );
    } finally {
      setSaving(false);
    }
  };

  const statsMap = useMemo(() => {
    const map = new Map<string, SourceStatRow>();
    stats.forEach((entry) => map.set(entry.source, entry));
    return map;
  }, [stats]);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Waitlist QR</h1>
        <p className="mt-1 text-sm text-muted">
          Crea fuentes QR por ubicación y rastrea cuántos registros llegan desde
          cada código.
        </p>
      </header>

      {setupHints ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          Falta setup en Supabase:
          {setupHints.sourcesTableMissing ? " waitlist_qr_sources" : ""}
          {setupHints.statsViewMissing ? " waitlist_by_source" : ""}. Ejecuta el
          SQL del repo en <code>db/waitlist_qr_sources.sql</code>.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : null}

      <div className="futuristic-panel p-4 md:p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-white/10 bg-surfaceMuted/40 p-3">
            <div className="eyebrow">
              Fuentes creadas
            </div>
            <div className="mt-1 text-2xl font-bold">{sources.length}</div>
          </div>
          <div className="border border-white/10 bg-surfaceMuted/40 p-3">
            <div className="eyebrow">
              Registros directos
            </div>
            <div className="mt-1 text-2xl font-bold">{directCount}</div>
          </div>
          <div className="border border-white/10 bg-surfaceMuted/40 p-3">
            <div className="eyebrow">
              Fuentes detectadas externas
            </div>
            <div className="mt-1 text-2xl font-bold">{discovered.length}</div>
          </div>
        </div>
      </div>

      <form
        onSubmit={saveSource}
        className="futuristic-panel p-4 md:p-5"
      >
        <h2 className="text-base font-semibold">Crear nuevo QR</h2>
        <p className="mt-1 text-xs text-muted">
          URL base actual: <span className="text-white">{waitlistBaseUrl}</span>
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted">Slug (src)</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="diunsa"
              className="w-full border border-white/20 bg-surfaceMuted px-3 py-2 text-sm outline-none focus:border-primary"
              required
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted">Etiqueta</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Diunsa"
              className="w-full border border-white/20 bg-surfaceMuted px-3 py-2 text-sm outline-none focus:border-primary"
              required
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted">Ubicación</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Sucursal Kennedy"
              className="w-full border border-white/20 bg-surfaceMuted px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-muted">Notas</span>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sticker caja principal"
              className="w-full border border-white/20 bg-surfaceMuted px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="mt-4 border border-white bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar y generar"}
        </button>
      </form>

      {loading ? (
        <div className="futuristic-panel p-5 text-sm text-muted">
          Cargando fuentes QR...
        </div>
      ) : sources.length === 0 ? (
        <div className="futuristic-panel p-5 text-sm text-muted">
          Aún no hay fuentes QR creadas.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sources.map((source) => (
            <SourceQrCard
              key={source.slug}
              source={source}
              stats={statsMap.get(source.slug)}
              waitlistBaseUrl={waitlistBaseUrl}
            />
          ))}
        </div>
      )}
    </section>
  );
}
