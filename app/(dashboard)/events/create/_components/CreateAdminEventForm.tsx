"use client";

import { EventImagesUploadField } from "@/components/admin/EventImagesUploadField";
import { EventFormFieldsEditor } from "@/components/admin/EventFormFieldsEditor";
import { EventLocationPickerField } from "@/components/admin/EventLocationPickerField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ProviderOption } from "@/lib/admin/providerOptions";
import { useActionState, useMemo, useState } from "react";
import { createAdminEventAction } from "../actions";

const COLOR_OPTIONS = ["#F67010", "#3A86FF", "#8338EC", "#138A36", "#FF006E"];

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function CreateAdminEventForm({ providers }: { providers: ProviderOption[] }) {
  const [state, action, isPending] = useActionState(createAdminEventAction, null);
  const [price, setPrice] = useState("0");
  const [capacity, setCapacity] = useState("100");

  const ticketModeLabel = useMemo(() => {
    const parsed = Number(price);
    return Number.isFinite(parsed) && parsed > 0
      ? "Ticket pagado"
      : "Registro gratuito";
  }, [price]);

  return (
    <form
      action={action}
      encType="multipart/form-data"
      className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
    >
      <section className="futuristic-panel p-5">
        <div className="eyebrow">Evento</div>
        <h2 className="mt-1 text-xl font-semibold">Datos públicos</h2>

        {state?.error ? (
          <div className="mt-4 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {state.error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <div>
            <Label>Comercio *</Label>
            <NativeSelect name="providerId" required defaultValue="">
              <option value="" disabled>
                Selecciona comercio
              </option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}{provider.handle ? ` · ${provider.handle}` : ""}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label>Título *</Label>
            <Input
              name="title"
              required
              placeholder="Networking Night · The Hub"
            />
          </div>

          <div>
            <Label>Descripción</Label>
            <Textarea
              name="description"
              rows={5}
              placeholder="Cuenta qué recibirá el cliente al abrir el evento en la app."
              className="resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Fecha *</Label>
              <Input
                name="date"
                type="date"
                required
                defaultValue={tomorrowDate()}
              />
            </div>
            <div>
              <Label>Hora *</Label>
              <Input name="time" type="time" required defaultValue="19:00" />
            </div>
          </div>

          <div>
            <Label>Lugar</Label>
            <Input name="venue" placeholder="The Hub" />
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="futuristic-panel p-5">
          <div className="eyebrow">Tickets</div>
          <h2 className="mt-1 text-xl font-semibold">Primer tipo de entrada</h2>
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Capacidad *</Label>
                <Input
                  name="capacity"
                  value={capacity}
                  onChange={(event) =>
                    setCapacity(event.target.value.replace(/\D/g, ""))
                  }
                  inputMode="numeric"
                  required
                />
              </div>
              <div>
                <Label>Cantidad tickets *</Label>
                <Input
                  name="ticketTotal"
                  defaultValue={capacity || "100"}
                  inputMode="numeric"
                  required
                />
              </div>
            </div>

            <div>
              <Label>Nombre entrada</Label>
              <Input name="ticketName" defaultValue="General" />
            </div>

            <div>
              <Label>Precio HNL</Label>
              <Input
                name="ticketPrice"
                value={price}
                onChange={(event) =>
                  setPrice(event.target.value.replace(/[^\d.]/g, ""))
                }
                inputMode="decimal"
              />
            </div>

            <div className="border border-white/10 bg-white/[0.03] p-3 text-sm text-white/65">
              {ticketModeLabel}. Si el precio es 0, el evento se publica como gratuito.
            </div>
          </div>
        </div>

      </section>

      <div className="lg:col-span-2">
        <EventLocationPickerField />
      </div>

      <div className="lg:col-span-2">
        <EventImagesUploadField />
      </div>

      <div className="lg:col-span-2">
          <EventFormFieldsEditor
            initialFields={[]}
            eyebrow="Formulario"
            title="Campos personalizados"
            description="Opcional. Agrega aquí las preguntas que se pedirán en el registro web antes de publicar el evento. Nombre y correo siempre se solicitan."
            emptyMessage="Si no agregas campos, el registro web solo pedirá nombre y correo."
          />
      </div>

      <section className="futuristic-panel p-5 lg:col-span-2">
          <div className="eyebrow">Publicación</div>
          <div className="mt-5 space-y-4">
            <div>
              <Label>Estado</Label>
              <NativeSelect name="status" defaultValue="published">
                <option value="published">Publicar en la app</option>
                <option value="draft">Guardar borrador</option>
              </NativeSelect>
            </div>

            <div>
              <Label>Color</Label>
              <NativeSelect name="themeColor" defaultValue={COLOR_OPTIONS[0]}>
                {COLOR_OPTIONS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </NativeSelect>
            </div>

            <Button
              type="submit"
              disabled={isPending || providers.length === 0}
              className="w-full"
              size="lg"
            >
              {isPending ? "Creando..." : "Crear evento y formulario"}
            </Button>

            <p className="text-xs leading-5 text-white/45">
              Al crear, el evento y su formulario quedan asociados al comercio real. Si está publicado, aparecerá en la app cliente.
            </p>
          </div>
      </section>
    </form>
  );
}
