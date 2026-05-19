"use client";

import { PageHeader } from "@/components/PageHeader";
import {
  broadcastNotification,
  type AdminNotificationAudience,
  type AdminNotificationTab,
} from "@/lib/admin/notificationsApi";
import { useState } from "react";

export default function NotificationsPage() {
  const [audience, setAudience] = useState<AdminNotificationAudience>("clients");
  const [categoryLabel, setCategoryLabel] = useState<string>("Novedades");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [dedupeKey, setDedupeKey] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const onSubmit = async () => {
    setResult(null);
    setSubmitting(true);
    try {
      const payload = {
        audience,
        categoryLabel: categoryLabel.trim() || null,
        title: title.trim(),
        description: description.trim() || null,
        tabs: ["eventos"] as AdminNotificationTab[],
        dedupeKey: dedupeKey.trim() || null,
      };
      if (!payload.title) throw new Error("title es requerido");
      await broadcastNotification(payload);
      setResult("Enviado");
      setTitle("");
      setDescription("");
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificaciones"
        description="Enviar una notificación a clientes o proveedores."
      />

      <section className="futuristic-panel p-5 space-y-4 max-w-3xl">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <div className="eyebrow">Audiencia</div>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as AdminNotificationAudience)}
              className="w-full bg-surfaceMuted/40 border border-white/10 px-3 py-2 text-sm"
            >
              <option value="clients">Clientes</option>
              <option value="providers">Proveedores</option>
            </select>
          </label>

          <label className="space-y-1">
            <div className="eyebrow">Categoría</div>
            <input
              value={categoryLabel}
              onChange={(e) => setCategoryLabel(e.target.value)}
              className="w-full bg-surfaceMuted/40 border border-white/10 px-3 py-2 text-sm"
              placeholder="Novedades"
            />
          </label>
        </div>

        <label className="space-y-1 block">
          <div className="eyebrow">Título</div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-surfaceMuted/40 border border-white/10 px-3 py-2 text-sm"
            placeholder="Nuevo evento publicado"
          />
        </label>

        <label className="space-y-1 block">
          <div className="eyebrow">Descripción</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-surfaceMuted/40 border border-white/10 px-3 py-2 text-sm min-h-[96px]"
            placeholder="Texto opcional"
          />
        </label>

        <label className="space-y-1 block">
          <div className="eyebrow">Dedupe key (opcional)</div>
          <input
            value={dedupeKey}
            onChange={(e) => setDedupeKey(e.target.value)}
            className="w-full bg-surfaceMuted/40 border border-white/10 px-3 py-2 text-sm"
            placeholder="promo:2026-05"
          />
          <div className="text-xs text-muted">
            Si la misma audiencia recibe de nuevo la misma dedupe key, no se duplica.
          </div>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="rounded-lg bg-white text-black px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            {submitting ? "Enviando…" : "Enviar"}
          </button>
          {result ? <div className="text-sm text-muted">{result}</div> : null}
        </div>
      </section>
    </div>
  );
}
