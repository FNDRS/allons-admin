"use client";

import { EventBannerMediaField } from "@/components/admin/EventBannerMediaField";
import { EventCategoryField } from "@/components/admin/EventCategoryField";
import { EventFormFieldsEditor } from "@/components/admin/EventFormFieldsEditor";
import { EventLocationPickerField } from "@/components/admin/EventLocationPickerField";
import { EventTicketsField } from "@/components/admin/EventTicketsField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ProviderOption } from "@/lib/admin/providerOptions";
import { useActionState, useState } from "react";
import { createAdminEventAction } from "../actions";

/** Mismos valores por defecto que el formulario de la app: dentro de 7 días. */
function defaultEventDate() {
  return new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
}

function addMinutesToTimeString(time: string, minutes: number) {
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  const total = (hh || 0) * 60 + (mm || 0) + minutes;
  const wrapped = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(
    wrapped % 60,
  ).padStart(2, "0")}`;
}

const DEFAULT_TIME = "20:00";

export function CreateAdminEventForm({ providers }: { providers: ProviderOption[] }) {
  const [state, action, isPending] = useActionState(createAdminEventAction, null);

  // El banner, la ventana de venta y el aviso de capacidad reaccionan a estos
  // valores, así que viven en el formulario y no en cada campo.
  const [title, setTitle] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [date, setDate] = useState(defaultEventDate);
  const [time, setTime] = useState(DEFAULT_TIME);
  const [endTime, setEndTime] = useState(() =>
    addMinutesToTimeString(DEFAULT_TIME, 60),
  );

  return (
    <form action={action} encType="multipart/form-data" className="space-y-6">
      {state?.error ? (
        <div className="border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {state.error}
        </div>
      ) : null}

      <EventBannerMediaField title={title} />

      <section className="futuristic-panel p-5">
        <div className="eyebrow">Evento</div>
        <h2 className="mt-1 text-xl font-semibold">Datos públicos</h2>

        <div className="mt-5 space-y-4">
          <div>
            <Label>Comercio *</Label>
            <NativeSelect name="providerId" required defaultValue="">
              <option value="" disabled>
                Selecciona comercio
              </option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                  {provider.handle ? ` · ${provider.handle}` : ""}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div>
            <Label>Título *</Label>
            <Input
              name="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Noche Tropical · Roatán"
            />
          </div>

          <div>
            <Label>Descripción</Label>
            <Textarea
              name="description"
              rows={5}
              placeholder="Cuenta a tus asistentes qué los espera"
              className="resize-none"
            />
          </div>

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
              placeholder="200"
            />
          </div>
        </div>
      </section>

      <EventLocationPickerField />

      <section className="futuristic-panel p-5">
        <div className="eyebrow">Detalles</div>
        <h2 className="mt-1 text-xl font-semibold">Cómo llegar y cuándo</h2>

        <div className="mt-5 space-y-4">
          <div>
            <Label>Detalles de cómo llegar (no requerido)</Label>
            <Textarea
              name="venue"
              rows={3}
              placeholder="Ej. Entrada principal frente al parqueo, 2do nivel, timbre azul"
              className="resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Fecha *</Label>
              <Input
                name="date"
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div>
              <Label>Hora inicio *</Label>
              <Input
                name="time"
                type="time"
                required
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
            <div>
              <Label>Hora fin</Label>
              <Input
                name="endTime"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <EventCategoryField />

      <EventTicketsField eventDate={date} eventTime={time} capacity={capacity} />

      <EventFormFieldsEditor
        initialFields={[]}
        eyebrow="Formulario"
        title="Formulario especial del evento"
        description="Opcional. Agrega aquí las preguntas que se pedirán en el registro web antes de publicar el evento. Nombre y correo siempre se solicitan."
        emptyMessage="Si no agregas campos, el registro web solo pedirá nombre y correo."
      />

      <section className="futuristic-panel p-5">
        <div className="eyebrow">Publicación</div>
        <div className="mt-5 space-y-4">
          <div>
            <Label>Estado</Label>
            <NativeSelect name="status" defaultValue="published">
              <option value="published">Publicar en la app</option>
              <option value="draft">Guardar borrador</option>
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
            Al crear, el evento, sus tickets y su formulario especial quedan
            asociados al comercio real. Si está publicado, aparecerá en la app
            cliente.
          </p>
        </div>
      </section>
    </form>
  );
}
