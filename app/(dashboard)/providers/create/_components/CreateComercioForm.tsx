"use client";

import { useActionState, useState, useCallback, useMemo, useRef } from "react";
import { createComercioAction } from "../actions";

const ALLONS_FEE_PCT = 12;
const ISV_RATE = 0.15;
const EXAMPLE_TICKET = 1000;

const BUSINESS_TYPES = [
  { value: "ong", label: "ONG / Sin fines de lucro", defaultPct: 2 },
  { value: "tecnologia", label: "Tecnología / Startup", defaultPct: 7 },
  { value: "empresa", label: "Empresa / Comercio", defaultPct: 5 },
  { value: "otro", label: "Otro", defaultPct: 5 },
] as const;

type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

const PLANS = [
  {
    id: "basico",
    name: "Básico",
    price: 499,
    tagline: "Para ONGs y negocios pequeños",
    features: [
      "Hasta 4 eventos activos",
      "Hasta 500 tickets por evento",
      "Analytics básicos",
      "Soporte por email",
      "Panel de gestión de staff",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 1499,
    tagline: "Para empresas y tecnología",
    features: [
      "Eventos y tickets ilimitados",
      "Analytics avanzados con gráficas",
      "Soporte WhatsApp + email",
      "Códigos de descuento y referidos",
      "Branding personalizado",
    ],
  },
] as const;

const COLOR_OPTIONS = [
  "#F67010",
  "#3A86FF",
  "#8338EC",
  "#138A36",
  "#FF006E",
  "#FFBE0B",
];

function toHandle(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
}

export function CreateComercioForm() {
  const [state, action, isPending] = useActionState(createComercioAction, null);

  // ── Business ──
  const [brandName, setBrandName] = useState("");
  const [brandHandle, setBrandHandle] = useState("");
  const [handleEdited, setHandleEdited] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>("empresa");
  const [brandColor, setBrandColor] = useState(COLOR_OPTIONS[0]);

  // ── Paygate ──
  const [paygateFeePct, setPaygateFeePct] = useState("5");
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [contractPreview, setContractPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Subscription ──
  const [plan, setPlan] = useState<string>("pendiente");

  const handleBrandNameChange = useCallback(
    (v: string) => {
      setBrandName(v);
      if (!handleEdited) setBrandHandle(toHandle(v));
    },
    [handleEdited],
  );

  const handleBusinessTypeChange = useCallback((type: BusinessType) => {
    setBusinessType(type);
    const def = BUSINESS_TYPES.find((t) => t.value === type)?.defaultPct ?? 5;
    setPaygateFeePct(def.toString());
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      setContractFile(file);
      if (file) {
        const url = URL.createObjectURL(file);
        setContractPreview(url);
      } else {
        setContractPreview(null);
      }
    },
    [],
  );

  const freeTrialEnd = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toLocaleDateString("es-HN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  const parsedPct = useMemo(() => {
    const n = parseFloat(paygateFeePct);
    return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
  }, [paygateFeePct]);

  const breakdown = useMemo(() => {
    const allons = EXAMPLE_TICKET * (ALLONS_FEE_PCT / 100);
    const isv = allons * ISV_RATE;
    const paygate = EXAMPLE_TICKET * (parsedPct / 100);
    const organizer = EXAMPLE_TICKET - allons - isv - paygate;
    return { allons, isv, paygate, organizer };
  }, [parsedPct]);

  const inputCls =
    "w-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none rounded-lg";

  return (
    <form action={action} className="space-y-8">
      {/* Error banner */}
      {state?.error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      ) : null}

      {/* ── RESPONSABLE ── */}
      <section className="futuristic-panel space-y-5 p-6">
        <p className="eyebrow">Responsable</p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">
              Nombre completo <span className="text-orange-400">*</span>
            </label>
            <input
              name="fullName"
              required
              placeholder="Ej. María García"
              autoComplete="off"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">
              Correo electrónico <span className="text-orange-400">*</span>
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="correo@ejemplo.com"
              autoComplete="off"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">
              Teléfono
            </label>
            <input
              name="phone"
              type="tel"
              placeholder="+504 9999-9999"
              className={inputCls}
            />
          </div>

          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-xs leading-relaxed text-white/55">
            Al crear el comercio, Supabase envía al correo un enlace de
            invitación. El comercio fija su propia contraseña al ingresar — no
            se comparten credenciales por separado.
          </div>
        </div>
      </section>

      {/* ── NEGOCIO ── */}
      <section className="futuristic-panel space-y-5 p-6">
        <p className="eyebrow">Negocio</p>

        {/* Preview card */}
        <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: brandColor }}
          >
            {brandName.trim().charAt(0).toUpperCase() || "?"}
          </div>
          <div>
            <p className="font-semibold text-white">
              {brandName.trim() || "Nombre del negocio"}
            </p>
            <p className="text-sm text-white/40">@{brandHandle || "handle"}</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">
              Nombre del negocio <span className="text-orange-400">*</span>
            </label>
            <input
              name="brandName"
              required
              value={brandName}
              onChange={(e) => handleBrandNameChange(e.target.value)}
              placeholder="Ej. TechFest Honduras"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">
              Handle (@) <span className="text-orange-400">*</span>
            </label>
            <div className="flex items-center border border-white/10 bg-white/[0.04] rounded-lg overflow-hidden focus-within:border-white/30">
              <span className="pl-4 text-sm text-white/40">@</span>
              <input
                name="brandHandle"
                required
                value={brandHandle}
                onChange={(e) => {
                  setHandleEdited(true);
                  setBrandHandle(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "")
                      .slice(0, 20),
                  );
                }}
                placeholder="techfesthonduras"
                className="flex-1 bg-transparent px-2 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-3 block text-xs font-semibold text-white/60">
            Tipo de negocio <span className="text-orange-400">*</span>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            {BUSINESS_TYPES.map((t) => (
              <label
                key={t.value}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3.5 transition ${
                  businessType === t.value
                    ? "border-orange-500/50 bg-orange-500/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="businessType"
                  value={t.value}
                  checked={businessType === t.value}
                  onChange={() => handleBusinessTypeChange(t.value)}
                  className="accent-orange-500"
                />
                <div>
                  <p className="text-sm font-semibold text-white">{t.label}</p>
                  <p className="text-xs text-white/40">
                    Paygate sugerido: {t.defaultPct}%
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-3 block text-xs font-semibold text-white/60">
            Color de marca
          </label>
          <input type="hidden" name="brandColor" value={brandColor} />
          <div className="flex gap-3">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setBrandColor(c)}
                className={`h-8 w-8 rounded-full transition-transform ${
                  brandColor === c
                    ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-black"
                    : "hover:scale-110"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── PAYGATE & CONTRATO ── */}
      <section className="futuristic-panel space-y-5 p-6">
        <p className="eyebrow">Paygate & Contrato</p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">
              Comisión Paygate (%) <span className="text-orange-400">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                name="paygateFeePct"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={paygateFeePct}
                onChange={(e) => setPaygateFeePct(e.target.value)}
                className={`${inputCls} w-32`}
              />
              <span className="text-sm text-white/50">%</span>
            </div>
            <p className="mt-1.5 text-xs text-white/35">
              ONGs: ~2% · Tecnología: ~7% · Empresas: ~5% (según contrato bancario)
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/60">
              Contrato Paygate
            </label>
            <input
              ref={fileInputRef}
              type="file"
              name="contractFile"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {contractPreview ? (
              <div className="relative h-32 w-full overflow-hidden rounded-lg border border-white/10">
                {contractFile?.type === "application/pdf" ? (
                  <div className="flex h-full items-center justify-center bg-white/5 text-sm text-white/60">
                    📄 {contractFile.name}
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={contractPreview}
                    alt="Contrato"
                    className="h-full w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setContractFile(null);
                    setContractPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-red-400 hover:bg-black/90"
                >
                  Quitar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.02] py-6 text-sm text-white/40 transition hover:border-white/30 hover:text-white/60"
              >
                📎 Adjuntar contrato (imagen o PDF)
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── SUSCRIPCIÓN ── */}
      <section className="futuristic-panel space-y-5 p-6">
        <p className="eyebrow">Suscripción</p>

        <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-3 text-sm text-white/70">
          🎁 <strong className="text-white">6 meses gratis</strong> a partir de hoy ·
          Primer cobro estimado:{" "}
          <strong className="text-white">{freeTrialEnd}</strong>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PLANS.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer flex-col gap-3 rounded-xl border p-5 transition ${
                plan === p.id
                  ? "border-orange-500/50 bg-orange-500/8"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="subscriptionPlan"
                      value={p.id}
                      checked={plan === p.id}
                      onChange={() => setPlan(p.id)}
                      className="accent-orange-500"
                    />
                    <p className="font-bold text-white">{p.name}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-white/40">{p.tagline}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">L. {p.price}</p>
                  <p className="text-xs text-white/40">/mes</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-white/55">
                    <span
                      className={plan === p.id ? "text-orange-400" : "text-white/25"}
                    >
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </label>
          ))}
        </div>

        <label
          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
            plan === "pendiente"
              ? "border-orange-500/50 bg-orange-500/8"
              : "border-white/10 bg-white/[0.02] hover:border-white/20"
          }`}
        >
          <input
            type="radio"
            name="subscriptionPlan"
            value="pendiente"
            checked={plan === "pendiente"}
            onChange={() => setPlan("pendiente")}
            className="accent-orange-500"
          />
          <div>
            <p className="font-semibold text-white">Decidir después</p>
            <p className="text-xs text-white/40">
              El comercio elige su plan al finalizar los 6 meses gratis
            </p>
          </div>
        </label>
      </section>

      {/* ── DESGLOSE ── */}
      <section className="futuristic-panel p-6">
        <p className="eyebrow mb-4">Desglose por ticket</p>

        <div className="rounded-lg border border-white/8 bg-white/[0.02] overflow-hidden">
          <div className="border-b border-white/8 bg-white/[0.03] px-4 py-2.5 text-xs text-white/40">
            Ejemplo: ticket de L. {EXAMPLE_TICKET.toLocaleString()}
          </div>
          <div className="divide-y divide-white/6 text-sm">
            {[
              {
                label: `Comisión Allons (${ALLONS_FEE_PCT}%)`,
                value: `− L. ${breakdown.allons.toFixed(2)}`,
                cls: "text-red-400",
              },
              {
                label: `ISV sobre comisión (${(ISV_RATE * 100).toFixed(0)}%)`,
                value: `− L. ${breakdown.isv.toFixed(2)}`,
                cls: "text-red-400",
              },
              {
                label: `Paygate (${parsedPct}%)`,
                value: `− L. ${breakdown.paygate.toFixed(2)}`,
                cls: "text-red-400",
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-white/55">{row.label}</span>
                <span className={`font-semibold ${row.cls}`}>{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between bg-white/[0.03] px-4 py-3.5 font-bold">
              <span className="text-white">Organizador recibe</span>
              <span className="text-green-400">
                L. {breakdown.organizer.toFixed(2)}{" "}
                <span className="text-xs font-normal text-green-400/60">
                  ({((breakdown.organizer / EXAMPLE_TICKET) * 100).toFixed(1)}
                  %)
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 rounded-lg border border-white/6 bg-white/[0.02] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/35">
            Costos adicionales a considerar
          </p>
          {[
            "Chargebacks: ~$25 USD por disputa perdida (cargo del banco).",
            "Tarjetas internacionales: +1–3% adicional (varía por banco/Paygate).",
            "ISR sobre pagos: posible retención del 12.5% si el organizador supera L. 5,000/mes.",
            "Liquidación: fondos disponibles 3–7 días hábiles después del evento.",
            "Reembolsos: la comisión de Paygate no se devuelve en casos de reembolso.",
          ].map((note) => (
            <p key={note} className="text-xs text-white/35">
              · {note}
            </p>
          ))}
        </div>
      </section>

      {/* ── SUBMIT ── */}
      <div className="flex items-center justify-end gap-4 pb-8">
        <a
          href="/providers"
          className="border border-white/15 px-5 py-2.5 text-sm text-white/60 transition hover:border-white/30 hover:text-white"
        >
          Cancelar
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-[#F67010] px-6 py-2.5 text-sm font-bold text-white transition hover:bg-[#e06510] disabled:opacity-50"
        >
          {isPending ? (
            <>
              <span className="animate-spin">⟳</span> Creando…
            </>
          ) : (
            "Crear Comercio"
          )}
        </button>
      </div>
    </form>
  );
}
