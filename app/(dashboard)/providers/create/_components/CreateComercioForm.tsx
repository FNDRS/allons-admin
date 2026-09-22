"use client";

import { useActionState, useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  UPLOAD_CONFIGS,
  type UploadedFile,
  type UploadKind,
} from "@/lib/admin/uploads";
import { createComercioAction, type CreateComercioFormValues } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DEFAULT_ALLONS_FEE,
  PASARELA_FEE_BY_BUSINESS_TYPE,
  totalFee,
} from "@/lib/commissionTiers";

const EXAMPLE_TICKET = 1000;

const BUSINESS_TYPES = [
  { value: "ong", label: "ONG / Sin fines de lucro", defaultPct: 2 },
  { value: "tecnologia", label: "Tecnología / Startup", defaultPct: 7 },
  { value: "empresa", label: "Empresa / Comercio", defaultPct: 5 },
  { value: "otro", label: "Otro", defaultPct: 5 },
] as const;

type BusinessType = (typeof BUSINESS_TYPES)[number]["value"];

const COLOR_OPTIONS = [
  { value: "#F67010", label: "Allons naranja" },
  { value: "#3A86FF", label: "Azul" },
  { value: "#8338EC", label: "Morado" },
  { value: "#FF006E", label: "Fucsia" },
  { value: "#138A36", label: "Verde" },
  { value: "#FFBE0B", label: "Amarillo" },
  { value: "#350B57", label: "Púrpura oscuro" },
  { value: "#1C1B20", label: "Grafito" },
];

function toHandle(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]/g, "")
    .slice(0, 20);
}

function applyFormValues(
  values: CreateComercioFormValues,
  setters: {
    setFullName: (v: string) => void;
    setEmail: (v: string) => void;
    setPhone: (v: string) => void;
    setBrandName: (v: string) => void;
    setBrandHandle: (v: string) => void;
    setBrandDescription: (v: string) => void;
    setWebsiteUrl: (v: string) => void;
    setInstagramUrl: (v: string) => void;
    setHandleEdited: (v: boolean) => void;
    setBusinessType: (v: BusinessType) => void;
    setBrandColor: (v: string) => void;
    setPasarelaFeePct: (v: string) => void;
    setAllonsFeePct: (v: string) => void;
  },
) {
  setters.setFullName(values.fullName);
  setters.setEmail(values.email);
  setters.setPhone(values.phone);
  setters.setBrandName(values.brandName);
  setters.setBrandHandle(values.brandHandle);
  setters.setBrandDescription(values.brandDescription);
  setters.setWebsiteUrl(values.websiteUrl);
  setters.setInstagramUrl(values.instagramUrl);
  setters.setHandleEdited(Boolean(values.brandHandle));
  setters.setBusinessType(values.businessType as BusinessType);
  setters.setBrandColor(values.brandColor);
  setters.setPasarelaFeePct(values.pasarelaFeePct);
  setters.setAllonsFeePct(values.allonsFeePct);
}

/** Archivo ya subido; conserva nombre y tipo para la vista previa. */
type UploadedAsset = UploadedFile & { name: string; type: string };

/**
 * Sube un archivo por `/api/admin/uploads`.
 *
 * No puede ir por el Server Action: Next corta ese body a 1 MB y cualquier
 * logo o contrato lo supera ("Body exceeded 1 MB limit").
 */
async function uploadAdminFile(
  file: File,
  kind: UploadKind,
): Promise<{ ok: true; asset: UploadedAsset } | { ok: false; error: string }> {
  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  try {
    const response = await fetch("/api/admin/uploads", { method: "POST", body });
    const payload = (await response.json()) as UploadedFile | { error: string };
    if (!response.ok || !("url" in payload)) {
      return {
        ok: false,
        error: "error" in payload ? payload.error : `No se pudo subir ${file.name}.`,
      };
    }
    return {
      ok: true,
      asset: { ...payload, name: file.name, type: file.type },
    };
  } catch {
    return { ok: false, error: `No se pudo subir ${file.name}. Revisá la conexión.` };
  }
}

/** Borra del storage un archivo que se quitó antes de crear el comercio. */
async function deleteAdminFile(path: string, kind: UploadKind) {
  try {
    await fetch("/api/admin/uploads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, kind }),
    });
  } catch {
    // Un huérfano en storage no debe bloquear la creación del comercio.
  }
}

export function CreateComercioForm() {
  const [state, action, isPending] = useActionState(createComercioAction, null);

  // ── Responsable ──
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // ── Business ──
  const [brandName, setBrandName] = useState("");
  const [brandHandle, setBrandHandle] = useState("");
  const [brandDescription, setBrandDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [handleEdited, setHandleEdited] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>("empresa");
  const [brandColor, setBrandColor] = useState(COLOR_OPTIONS[0].value);
  const [logoFile, setLogoFile] = useState<UploadedAsset | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // ── Pasarela (Clinpays / banco) & Contrato ──
  const [pasarelaFeePct, setPasarelaFeePct] = useState("5");
  const [allonsFeePct, setAllonsFeePct] = useState(String(DEFAULT_ALLONS_FEE));
  const [contractFile, setContractFile] = useState<UploadedAsset | null>(null);
  const [contractPreview, setContractPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!state?.values) return;
    applyFormValues(state.values, {
      setFullName,
      setEmail,
      setPhone,
      setBrandName,
      setBrandHandle,
      setBrandDescription,
      setWebsiteUrl,
      setInstagramUrl,
      setHandleEdited,
      setBusinessType,
      setBrandColor,
      setPasarelaFeePct,
      setAllonsFeePct,
    });
  }, [state]);

  const handleBrandNameChange = useCallback(
    (v: string) => {
      setBrandName(v);
      if (!handleEdited) setBrandHandle(toHandle(v));
    },
    [handleEdited],
  );

  const handleBusinessTypeChange = useCallback((type: BusinessType) => {
    setBusinessType(type);
    const def =
      PASARELA_FEE_BY_BUSINESS_TYPE[type] ??
      BUSINESS_TYPES.find((t) => t.value === type)?.defaultPct ??
      5;
    setPasarelaFeePct(def.toString());
  }, []);

  const parsedPasarela = useMemo(() => {
    const n = parseFloat(pasarelaFeePct);
    return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
  }, [pasarelaFeePct]);

  const parsedAllons = useMemo(() => {
    const n = parseFloat(allonsFeePct);
    return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
  }, [allonsFeePct]);

  const parsedTotal = totalFee(parsedAllons, parsedPasarela);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      if (!file) return;
      setIsUploadingContract(true);
      setUploadError(null);
      const uploaded = await uploadAdminFile(file, "comercio-contract");
      setIsUploadingContract(false);
      if (!uploaded.ok) {
        setUploadError(uploaded.error);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setContractFile(uploaded.asset);
      setContractPreview(uploaded.asset.url);
    },
    [],
  );

  const handleLogoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      if (!file) return;
      setIsUploadingLogo(true);
      setUploadError(null);
      const uploaded = await uploadAdminFile(file, "provider-logo");
      setIsUploadingLogo(false);
      if (!uploaded.ok) {
        setUploadError(uploaded.error);
        if (logoInputRef.current) logoInputRef.current.value = "";
        return;
      }
      setLogoFile(uploaded.asset);
      setLogoPreview(uploaded.asset.url);
    },
    [],
  );

  return (
    <form action={action} className="space-y-8">
      {/* Error banner */}
      {uploadError ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {uploadError}
        </div>
      ) : null}
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
            <Label>
              Nombre completo <span className="text-orange-400">*</span>
            </Label>
            <Input
              name="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. María García"
              autoComplete="off"
            />
          </div>

          <div>
            <Label>
              Correo electrónico <span className="text-orange-400">*</span>
            </Label>
            <Input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              autoComplete="off"
            />
          </div>

          <div>
            <Label>Teléfono</Label>
            <Input
              name="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+504 9999-9999"
            />
          </div>

          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-xs leading-relaxed text-white/55">
            Al crear el comercio se manda un enlace de invitación al correo.
            Ahí eligen su contraseña. No mandamos una clave aparte.
          </div>
        </div>
      </section>

      {/* ── NEGOCIO ── */}
      <section className="futuristic-panel space-y-5 p-6">
        <p className="eyebrow">Negocio</p>

        {/* Preview card */}
        <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-4">
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoPreview}
              alt="Logo del comercio"
              className="h-14 w-14 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {brandName.trim().charAt(0).toUpperCase() || "?"}
            </div>
          )}
          <div>
            <p className="font-semibold text-white">
              {brandName.trim() || "Nombre del negocio"}
            </p>
            <p className="text-sm text-white/40">@{brandHandle || "handle"}</p>
            {brandDescription ? (
              <p className="mt-1 line-clamp-2 max-w-xl text-xs text-white/45">
                {brandDescription}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <Label>Logo de marca</Label>
          <input
            ref={logoInputRef}
            type="file"
            accept={UPLOAD_CONFIGS["provider-logo"].accept}
            onChange={(event) => void handleLogoChange(event)}
            className="hidden"
          />
          {/* Al action sólo viaja la URL: el archivo ya está en storage. */}
          <input type="hidden" name="logoUrl" value={logoFile?.url ?? ""} />
          <Button
            type="button"
            variant="outline"
            onClick={() => logoInputRef.current?.click()}
            className="h-auto border-dashed py-3"
          >
            {isUploadingLogo
              ? "Subiendo logo…"
              : logoFile
                ? `Logo: ${logoFile.name}`
                : "Subir logo del comercio"}
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>
              Nombre del negocio <span className="text-orange-400">*</span>
            </Label>
            <Input
              name="brandName"
              required
              value={brandName}
              onChange={(e) => handleBrandNameChange(e.target.value)}
              placeholder="Ej. TechFest Honduras"
            />
          </div>

          <div>
            <Label>
              Handle (@) <span className="text-orange-400">*</span>
            </Label>
            <div className="flex h-9 items-center overflow-hidden rounded-md border border-white/15 bg-white/4 focus-within:border-white/40 focus-within:ring-2 focus-within:ring-white/10">
              <span className="pl-3 text-sm text-white/40">@</span>
              <Input
                name="brandHandle"
                required
                value={brandHandle}
                onChange={(e) => {
                  setHandleEdited(true);
                  setBrandHandle(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9.]/g, "")
                      .slice(0, 20),
                  );
                }}
                placeholder="techfesthonduras"
                className="h-auto border-0 bg-transparent focus-visible:ring-0"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="mb-3">
            Tipo de negocio <span className="text-orange-400">*</span>
          </Label>
          <input type="hidden" name="businessType" value={businessType} />
          <div className="grid gap-2 sm:grid-cols-2">
            {BUSINESS_TYPES.map((t) => {
              const active = businessType === t.value;
              return (
                <Button
                  key={t.value}
                  type="button"
                  variant="outline"
                  aria-pressed={active}
                  onClick={() => handleBusinessTypeChange(t.value)}
                  className={cn(
                    "h-auto w-full justify-start gap-3 py-3.5 text-left font-normal normal-case tracking-normal",
                    active
                      ? "border-orange-500/50 bg-orange-500/10"
                      : "border-white/10 bg-white/[0.02]",
                  )}
                >
                  <span
                    className={cn(
                      "size-4 shrink-0 rounded-full border",
                      active
                        ? "border-orange-400 bg-orange-500"
                        : "border-white/30",
                    )}
                    aria-hidden
                  />
                  <span>
                    <span className="block text-sm font-semibold text-white">
                      {t.label}
                    </span>
                    <span className="block text-xs text-white/40">
                      Pasarela sugerida: {t.defaultPct}%
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="mb-3">Color de marca</Label>
          <input type="hidden" name="brandColor" value={brandColor} />
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] p-3">
            <span
              className="h-12 w-12 rounded-2xl border border-white/20"
              style={{ backgroundColor: brandColor }}
            />
            <div>
              <p className="text-sm font-semibold text-white">Color seleccionado</p>
              <p className="text-xs text-white/45">
                Se usa como avatar/acento cuando no hay logo.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            {COLOR_OPTIONS.map((c) => (
              <Button
                key={c.value}
                type="button"
                variant="outline"
                onClick={() => setBrandColor(c.value)}
                className={cn(
                  "h-auto justify-start gap-2 py-2 text-xs font-medium normal-case tracking-normal",
                  brandColor === c.value
                    ? "border-white bg-white/10 text-white"
                    : "text-white/55",
                )}
              >
                <span
                  className="h-6 w-6 shrink-0 rounded-full border border-white/20"
                  style={{ backgroundColor: c.value }}
                />
                {c.label}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <Label>Descripción pública</Label>
          <Textarea
            name="brandDescription"
            value={brandDescription}
            onChange={(e) => setBrandDescription(e.target.value.slice(0, 500))}
            placeholder="Cuéntale a tus clientes qué hace este comercio"
            className="min-h-28 resize-none"
          />
        </div>

        <div>
          <Label>Sitio web</Label>
          <Input
            name="websiteUrl"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://tucomercio.com"
          />
        </div>
        <div>
          <Label>Instagram</Label>
          <Input
            name="instagramUrl"
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="@tucomercio"
          />
        </div>
      </section>

      {/* ── PASARELA & CONTRATO ── */}
      <section className="futuristic-panel space-y-5 p-6">
        <p className="eyebrow">Pasarela y contrato</p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>
              Comisión Pasarela (%) <span className="text-orange-400">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                name="pasarelaFeePct"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={pasarelaFeePct}
                onChange={(e) => setPasarelaFeePct(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-white/50">%</span>
            </div>
            <p className="mt-1.5 text-xs text-white/35">
              Oferta de Clinpays y el banco para este comercio. ONGs ~2% ·
              Tecnología ~7% · Empresas ~5%. Se suma al porcentaje de Allons.
            </p>
          </div>

          <div>
            <Label>Contrato Paygate</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={UPLOAD_CONFIGS["comercio-contract"].accept}
              onChange={(event) => void handleFileChange(event)}
              className="hidden"
            />
            <input type="hidden" name="contractUrl" value={contractFile?.url ?? ""} />
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
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="absolute right-2 top-2"
                  onClick={() => {
                    if (contractFile) {
                      void deleteAdminFile(contractFile.path, "comercio-contract");
                    }
                    setContractFile(null);
                    setContractPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Quitar
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-auto w-full border-dashed py-6 text-white/40 hover:text-white/60"
              >
                {isUploadingContract
                  ? "Subiendo contrato…"
                  : "📎 Adjuntar contrato (imagen o PDF)"}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── COMISIÓN ── */}
      <section className="futuristic-panel p-6">
        <p className="eyebrow mb-4">Comisión</p>
        <p className="mb-5 text-xs leading-relaxed text-white/45">
          El total por ticket es la oferta del banco (arriba) más el porcentaje
          de Allons según la relación con este negocio. Se cobra
          automáticamente.
        </p>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="allonsFeePct">
              Comisión Allons (%) <span className="text-orange-400">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="allonsFeePct"
                name="allonsFeePct"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={allonsFeePct}
                onChange={(e) => setAllonsFeePct(e.target.value)}
                className="w-32"
              />
              <span className="text-sm text-white/50">%</span>
            </div>
            <p className="mt-1.5 text-xs text-white/35">
              Lo seteamos nosotros según la relación con el comercio.
            </p>
          </div>

          <div className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">
              Total por ticket
            </p>
            <p className="mt-1 text-2xl font-bold text-orange-400">
              {parsedTotal}%
            </p>
            <p className="mt-1 text-xs text-white/50">
              Banco {parsedPasarela}% + Allons {parsedAllons}%
            </p>
            <p className="mt-2 text-xs text-white/35">
              Ejemplo en un ticket de L. {EXAMPLE_TICKET.toLocaleString()}: se
              retiene L. {(EXAMPLE_TICKET * (parsedTotal / 100)).toFixed(2)}.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 rounded-lg border border-white/6 bg-white/[0.02] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/35">
            Otros costos
          </p>
          {[
            "Chargebacks: ~$25 USD por disputa perdida (cargo del banco).",
            "Tarjetas internacionales: +1-3% extra (según el banco).",
            "ISR sobre pagos: posible retención del 12.5% si el organizador supera L. 5,000/mes.",
            "Liquidación: fondos disponibles 3-7 días hábiles después del evento.",
            "Reembolsos: la comisión de la pasarela no se devuelve en casos de reembolso.",
          ].map((note) => (
            <p key={note} className="text-xs text-white/35">
              · {note}
            </p>
          ))}
        </div>
      </section>

      {/* ── SUBMIT ── */}
      <div className="flex items-center justify-end gap-4 pb-8">
        <Button asChild variant="outline">
          <a href="/providers">Cancelar</a>
        </Button>
        <Button type="submit" variant="brand" disabled={isPending}>
          {isPending ? (
            <>
              <span className="animate-spin">⟳</span> Creando…
            </>
          ) : (
            "Crear Comercio"
          )}
        </Button>
      </div>
    </form>
  );
}
