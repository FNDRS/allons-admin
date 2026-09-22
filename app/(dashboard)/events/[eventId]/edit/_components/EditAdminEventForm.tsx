"use client";

import { EventBannerMediaField } from "@/components/admin/EventBannerMediaField";
import { EventCategoryField } from "@/components/admin/EventCategoryField";
import { EventFormFieldsEditor } from "@/components/admin/EventFormFieldsEditor";
import { EventKitPickupField } from "@/components/admin/EventKitPickupField";
import { EventLocationPickerField } from "@/components/admin/EventLocationPickerField";
import { EventTicketSaleEndField } from "@/components/admin/EventTicketSaleEndField";
import { EventFeesCard } from "@/app/(dashboard)/events/[eventId]/_components/EventFeesCard";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import type { AdminEventTicketTypeRow } from "@/lib/admin/eventsApi";
import type { AdminEventFeeConfig } from "@/lib/admin/eventFeeConfig";
import type { DemoEventFormField } from "@/lib/eventFormFields";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { updateAdminEventAction } from "../actions";

export type EditAdminEventInitial = {
  title: string;
  description: string;
  capacity: string;
  venue: string;
  date: string;
  time: string;
  endTime: string;
  category: string | null;
  themeColor: string | null;
  images: { url: string }[];
  location: {
    latitude: number;
    longitude: number;
    address: string | null;
    city: string | null;
  } | null;
  kitPickupInfo: string;
  formFields: DemoEventFormField[] | null;
  ticketTypes: AdminEventTicketTypeRow[] | null;
  fees: AdminEventFeeConfig | null;
  hasPricedTicket: boolean;
};

export function EditAdminEventForm({
  eventId,
  providerName,
  initial,
}: {
  eventId: string;
  providerName: string;
  initial: EditAdminEventInitial;
}) {
  const [state, action, isPending] = useActionState(updateAdminEventAction, null);

  useEffect(() => {
    if (!state || state.ok) return;
    toast.error("No se pudo actualizar el evento", {
      id: "edit-admin-event-error",
      description: state.error,
      duration: 6000,
    });
  }, [state]);

  const [title, setTitle] = useState(initial.title);
  const [capacity, setCapacity] = useState(initial.capacity);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [endTime, setEndTime] = useState(initial.endTime);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="eventId" value={eventId} />

      {state && !state.ok ? (
        <div className="border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <section className="futuristic-panel p-5">
          <div className="eyebrow">Evento</div>
          <h2 className="mt-1 text-xl font-semibold">Datos públicos</h2>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Comercio: {providerName}.
          </p>

          <div className="mt-5 space-y-4">
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
                defaultValue={initial.description}
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

        <EventBannerMediaField
          title={title}
          initialImages={initial.images}
          initialColor={initial.themeColor}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <EventLocationPickerField initial={initial.location ?? undefined} />

        <section className="futuristic-panel p-5">
          <div className="eyebrow">Detalles</div>
          <h2 className="mt-1 text-xl font-semibold">Cómo llegar y cuándo</h2>

          <div className="mt-5 space-y-4">
            <div>
              <Label>Detalles de cómo llegar (no requerido)</Label>
              <Textarea
                name="venue"
                rows={3}
                defaultValue={initial.venue}
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

      <EventCategoryField initial={initial.category} />

      {initial.ticketTypes ? (
        <EventTicketSaleEndField tickets={initial.ticketTypes} />
      ) : null}

      <EventKitPickupField defaultValue={initial.kitPickupInfo} />

      {initial.formFields ? (
        <EventFormFieldsEditor
          initialFields={initial.formFields}
          eyebrow="Formulario"
          title="Formulario del evento"
          description="Opcional. Agrega las preguntas del registro web. Nombre y correo siempre se piden."
          emptyMessage="Si no agregas campos, el registro web solo pedirá nombre y correo."
        />
      ) : null}

      {initial.fees ? (
        <EventFeesCard
          embedded
          eventId={eventId}
          config={initial.fees}
          hasPricedTicket={initial.hasPricedTicket}
        />
      ) : null}

      <section className="futuristic-panel p-5">
        <Button
          type="submit"
          variant="default"
          disabled={isPending}
          className="w-full"
          size="lg"
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </Button>
      </section>
    </form>
  );
}
