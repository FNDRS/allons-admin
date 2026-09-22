"use client";

import { EventBannerMediaField } from "@/components/admin/EventBannerMediaField";
import { EventCategoryField } from "@/components/admin/EventCategoryField";
import { EventFormFieldsEditor } from "@/components/admin/EventFormFieldsEditor";
import { EventKitPickupField } from "@/components/admin/EventKitPickupField";
import { EventLocationPickerField } from "@/components/admin/EventLocationPickerField";
import { EventTicketsField } from "@/components/admin/EventTicketsField";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import type { ProviderOption } from "@/lib/admin/providerTypes";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { createAdminEventAction } from "../actions";
import Link from "next/link";

/** Fecha por defecto del evento: dentro de 7 días. */
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

  useEffect(() => {
    if (!state || state.ok) return;
    toast.error("No se pudo crear el evento", {
      id: "create-admin-event-error",
      description: state.error,
      duration: 6000,
    });
  }, [state]);

  // El banner, la ventana de venta y el aviso de capacidad reaccionan a estos
  // valores, así que viven en el formulario y no en cada campo.
  const [title, setTitle] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [date, setDate] = useState(defaultEventDate);
  const [time, setTime] = useState(DEFAULT_TIME);
  const [endTime, setEndTime] = useState(() =>
    addMinutesToTimeString(DEFAULT_TIME, 60),
  );
  const [configureKit, setConfigureKit] = useState(false);
  const [configureForm, setConfigureForm] = useState(false);

  return (
    <form action={action} className="space-y-6">
      {state && !state.ok ? (
        <div className="border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {state.error}
        </div>
      ) : null}

      {/*
        Fila 1: los datos que se escriben a la izquierda y su resultado visual
        (banner y galería) a la derecha, para verlos juntos.
      */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="futuristic-panel p-5">
        <div className="eyebrow">Evento</div>
        <h2 className="mt-1 text-xl font-semibold">Datos públicos</h2>

        <div className="mt-5 space-y-4">
          <div>
            <Label>Comercio *</Label>
            <Select
              name="providerId"
              required
              placeholder="Selecciona comercio"
            >
              <SelectItem value="">Selecciona comercio</SelectItem>
              {providers.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                  {provider.handle ? ` · ${provider.handle}` : ""}
                </SelectItem>
              ))}
            </Select>
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

      <EventBannerMediaField title={title} />
      </div>

      {/* Fila 2: el mapa ocupa alto, así que el resto de la ubicación va al lado. */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
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
              <DatePicker
                name="date"
                required
                value={date}
                onChange={setDate}
              />
            </div>
            <div>
              <Label>Hora inicio *</Label>
              <TimePicker
                name="time"
                required
                value={time}
                onChange={setTime}
              />
            </div>
            <div>
              <Label>Hora fin</Label>
              <TimePicker
                name="endTime"
                value={endTime}
                onChange={setEndTime}
              />
            </div>
          </div>
        </div>
      </section>
      </div>

      <EventCategoryField />

      <EventTicketsField eventDate={date} eventTime={time} capacity={capacity} />

      <section className="futuristic-panel p-5">
        <div className="eyebrow">Opcional</div>
        <h2 className="mt-1 text-xl font-semibold">Kit y formulario</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
          Márcalos solo si este evento los usa. Si no, no aparecen en el
          detalle. Los puedes agregar después, al editar el evento.
        </p>
        <div className="mt-5 space-y-3">
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={configureKit}
              onCheckedChange={setConfigureKit}
            />
            <span>Configurar retiro de kit</span>
          </label>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={configureForm}
              onCheckedChange={setConfigureForm}
            />
            <span>Configurar formulario de registro</span>
          </label>
        </div>
      </section>

      {configureKit ? <EventKitPickupField /> : null}

      {configureForm ? (
        <EventFormFieldsEditor
          initialFields={[]}
          eyebrow="Formulario"
          title="Formulario del evento"
          description="Opcional. Agrega aquí las preguntas que se pedirán en el registro web antes de publicar el evento. Nombre y correo siempre se solicitan."
          emptyMessage="Si no agregas campos, el registro web solo pedirá nombre y correo."
        />
      ) : null}

      <section className="futuristic-panel p-5">
        <div className="eyebrow">Publicación</div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-end">
          <div>
            <Label>Estado</Label>
            <Select name="status" defaultValue="published">
              <SelectItem value="published">Publicar en la app</SelectItem>
              <SelectItem value="draft">Guardar borrador</SelectItem>
            </Select>
          </div>

          <Button
            type="submit"
            variant="default"
            disabled={isPending || providers.length === 0}
            className="w-full"
            size="lg"
          >
            {isPending ? "Creando..." : "Crear evento"}
          </Button>
        </div>

        <p className="mt-4 text-xs leading-5 text-white/45">
          Al crear, el evento, sus tickets y su formulario quedan asociados al
          comercio. Si está publicado, aparecerá en la app.
        </p>
      </section>
      {/*
        Al crear no se redirige: el modal confirma y deja elegir a dónde ir.
        No tiene cancelar — el formulario de atrás ya no sirve para nada, sus
        campos crearían un evento duplicado.
      */}
      <AlertDialog open={Boolean(state?.ok)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {state?.ok && state.published
                ? "Evento publicado"
                : "Borrador guardado"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {state?.ok ? (
                <>
                  <span className="font-medium text-white">{state.title}</span>{" "}
                  {state.published
                    ? "ya está en la app y sus tickets quedaron cargados."
                    : "quedó como borrador: no aparece en la app hasta que lo publiques."}
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button asChild variant="outline">
              <Link href="/events">Ir a eventos</Link>
            </Button>
            <Button asChild>
              <Link href={`/events/${state?.ok ? state.eventId : ""}` as never}>
                Ver detalles
              </Link>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
