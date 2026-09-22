"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProviderProfile } from "@/lib/admin/providerTypes";
import {
  UPLOAD_CONFIGS,
  type UploadedFile,
  type UploadKind,
} from "@/lib/admin/uploads";
import {
  DEFAULT_ALLONS_FEE,
  PASARELA_FEE_BY_BUSINESS_TYPE,
  totalFee,
} from "@/lib/commissionTiers";
import { cn } from "@/lib/utils";
import { updateProviderAction } from "../actions";

const BUSINESS_TYPES = [
  { value: "ong", label: "ONG / Sin fines de lucro" },
  { value: "tecnologia", label: "Tecnología / Startup" },
  { value: "empresa", label: "Empresa / Comercio" },
  { value: "otro", label: "Otro" },
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

function asBusinessType(value: string | null): BusinessType {
  return BUSINESS_TYPES.some((type) => type.value === value)
    ? (value as BusinessType)
    : "empresa";
}

async function uploadAdminFile(
  file: File,
  kind: UploadKind,
): Promise<{ ok: true; url: string; name: string } | { ok: false; error: string }> {
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
    return { ok: true, url: payload.url, name: file.name };
  } catch {
    return { ok: false, error: `No se pudo subir ${file.name}. Revisá la conexión.` };
  }
}

export function EditProviderForm({
  userId,
  profile,
}: {
  userId: string;
  profile: ProviderProfile;
}) {
  const action = updateProviderAction.bind(null, userId);
  const [state, formAction, isPending] = useActionState(action, null);

  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [brandName, setBrandName] = useState(profile.brandName);
  const [brandHandle, setBrandHandle] = useState(profile.brandHandle ?? "");
  const [brandDescription, setBrandDescription] = useState(
    profile.brandDescription ?? "",
  );
  const [websiteUrl, setWebsiteUrl] = useState(profile.websiteUrl ?? "");
  const [businessType, setBusinessType] = useState<BusinessType>(
    asBusinessType(profile.businessType),
  );
  const [brandColor, setBrandColor] = useState(profile.brandColor || "#F67010");
  const [pasarelaFeePct, setPasarelaFeePct] = useState(
    String(profile.pasarelaFeePct ?? 5),
  );
  const [allonsFeePct, setAllonsFeePct] = useState(
    String(profile.allonsFeePct ?? DEFAULT_ALLONS_FEE),
  );
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl ?? "");
  const [logoName, setLogoName] = useState<string | null>(
    profile.logoUrl ? "Logo actual" : null,
  );
  const [contractUrl, setContractUrl] = useState(profile.contractUrl ?? "");
  const [contractName, setContractName] = useState<string | null>(
    profile.contractUrl ? "Contrato actual" : null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingContract, setIsUploadingContract] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state?.values) return;
    setFullName(state.values.fullName);
    setEmail(state.values.email);
    setPhone(state.values.phone);
    setBrandName(state.values.brandName);
    setBrandHandle(state.values.brandHandle);
    setBrandDescription(state.values.brandDescription);
    setWebsiteUrl(state.values.websiteUrl);
    setBusinessType(asBusinessType(state.values.businessType));
    setBrandColor(state.values.brandColor);
    setPasarelaFeePct(state.values.pasarelaFeePct);
    setAllonsFeePct(state.values.allonsFeePct);
  }, [state]);

  const parsedTotal = useMemo(() => {
    const pasarela = Number.parseFloat(pasarelaFeePct);
    const allons = Number.parseFloat(allonsFeePct);
    return totalFee(
      Number.isFinite(allons) ? allons : DEFAULT_ALLONS_FEE,
      Number.isFinite(pasarela) ? pasarela : 0,
    );
  }, [pasarelaFeePct, allonsFeePct]);

  const onLogo = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingLogo(true);
    setUploadError(null);
    const uploaded = await uploadAdminFile(file, "provider-logo");
    setIsUploadingLogo(false);
    if (!uploaded.ok) {
      setUploadError(uploaded.error);
      return;
    }
    setLogoUrl(uploaded.url);
    setLogoName(uploaded.name);
  }, []);

  const onContract = useCallback(async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingContract(true);
    setUploadError(null);
    const uploaded = await uploadAdminFile(file, "comercio-contract");
    setIsUploadingContract(false);
    if (!uploaded.ok) {
      setUploadError(uploaded.error);
      return;
    }
    setContractUrl(uploaded.url);
    setContractName(uploaded.name);
  }, []);

  return (
    <form action={formAction} className="space-y-8">
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
        </div>
      </section>

      <section className="futuristic-panel space-y-5 p-6">
        <p className="eyebrow">Negocio</p>
        <div className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/2 p-4">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
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
          </div>
        </div>

        <div>
          <Label>Logo de marca</Label>
          <input
            ref={logoInputRef}
            type="file"
            accept={UPLOAD_CONFIGS["provider-logo"].accept}
            onChange={(event) => void onLogo(event.target.files?.[0])}
            className="hidden"
          />
          <input type="hidden" name="logoUrl" value={logoUrl} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => logoInputRef.current?.click()}
            >
              {isUploadingLogo
                ? "Subiendo logo…"
                : logoName
                  ? logoName
                  : "Subir logo del comercio"}
            </Button>
            {logoUrl ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setLogoUrl("");
                  setLogoName(null);
                }}
              >
                Quitar logo
              </Button>
            ) : null}
          </div>
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
              onChange={(e) => setBrandName(e.target.value)}
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
                onChange={(e) =>
                  setBrandHandle(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9.]/g, "")
                      .slice(0, 20),
                  )
                }
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
            {BUSINESS_TYPES.map((type) => {
              const active = businessType === type.value;
              const suggested = PASARELA_FEE_BY_BUSINESS_TYPE[type.value];
              return (
                <Button
                  key={type.value}
                  type="button"
                  variant="outline"
                  aria-pressed={active}
                  onClick={() => setBusinessType(type.value)}
                  className={cn(
                    "h-auto w-full justify-start gap-3 py-3.5 text-left font-normal normal-case tracking-normal",
                    active
                      ? "border-orange-500/50 bg-orange-500/10"
                      : "border-white/10 bg-white/2",
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
                      {type.label}
                    </span>
                    <span className="block text-xs text-white/40">
                      Pasarela sugerida: {suggested}%
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
          <div className="grid gap-2 sm:grid-cols-4">
            {COLOR_OPTIONS.map((color) => (
              <Button
                key={color.value}
                type="button"
                variant="outline"
                onClick={() => setBrandColor(color.value)}
                className={cn(
                  "h-auto justify-start gap-2 py-2 text-xs font-medium normal-case tracking-normal",
                  brandColor === color.value
                    ? "border-white bg-white/10 text-white"
                    : "text-white/55",
                )}
              >
                <span
                  className="h-6 w-6 shrink-0 rounded-full border border-white/20"
                  style={{ backgroundColor: color.value }}
                />
                {color.label}
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
      </section>

      <section className="futuristic-panel space-y-5 p-6">
        <p className="eyebrow">Pasarela y contrato</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>
              Comisión pasarela (%) <span className="text-orange-400">*</span>
            </Label>
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
          </div>
          <div>
            <Label>
              Comisión Allons (%) <span className="text-orange-400">*</span>
            </Label>
            <Input
              name="allonsFeePct"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={allonsFeePct}
              onChange={(e) => setAllonsFeePct(e.target.value)}
              className="w-32"
            />
          </div>
        </div>
        <p className="text-xs text-white/45">
          Total por ticket: {parsedTotal}%.
        </p>
        <div>
          <Label>Contrato Paygate</Label>
          <input
            ref={contractInputRef}
            type="file"
            accept={UPLOAD_CONFIGS["comercio-contract"].accept}
            onChange={(event) => void onContract(event.target.files?.[0])}
            className="hidden"
          />
          <input type="hidden" name="contractUrl" value={contractUrl} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => contractInputRef.current?.click()}
            >
              {isUploadingContract
                ? "Subiendo contrato…"
                : contractName
                  ? contractName
                  : "Subir contrato"}
            </Button>
            {contractUrl ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setContractUrl("");
                  setContractName(null);
                }}
              >
                Quitar contrato
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" variant="brand" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
