"use client";

import { DashboardPage, DashboardScroll } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
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
      if (!payload.title) throw new Error("Falta el título");
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
    <DashboardPage>
      <PageHeader
        title="Notificaciones"
        description="Aviso para clientes o comercios."
      />

      <DashboardScroll>
      <section className="futuristic-panel p-5 space-y-4 max-w-3xl">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Audiencia</Label>
            <NativeSelect
              value={audience}
              onChange={(e) =>
                setAudience(e.target.value as AdminNotificationAudience)
              }
            >
              <option value="clients">Clientes</option>
              <option value="providers">Proveedores</option>
            </NativeSelect>
          </div>

          <div>
            <Label>Categoría</Label>
            <Input
              value={categoryLabel}
              onChange={(e) => setCategoryLabel(e.target.value)}
              placeholder="Novedades"
            />
          </div>
        </div>

        <div>
          <Label>Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nuevo evento publicado"
          />
        </div>

        <div>
          <Label>Descripción</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Texto opcional"
          />
        </div>

        <div>
          <Label>Dedupe key (opcional)</Label>
          <Input
            value={dedupeKey}
            onChange={(e) => setDedupeKey(e.target.value)}
            placeholder="promo:2026-05"
          />
          <p className="mt-1.5 text-xs text-muted">
            Si mandas la misma clave a la misma audiencia, no se duplica.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button type="button" onClick={onSubmit} disabled={submitting}>
            {submitting ? "Enviando…" : "Enviar"}
          </Button>
          {result ? <div className="text-sm text-muted">{result}</div> : null}
        </div>
      </section>
      </DashboardScroll>
    </DashboardPage>
  );
}
