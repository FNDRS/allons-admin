"use client";

import { EventFormFieldsEditor } from "@/components/admin/EventFormFieldsEditor";
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
    <form action={action} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="futuristic-panel p-5">
        <div className="eyebrow">Evento</div>
        <h2 className="mt-1 text-xl font-semibold">Datos públicos</h2>

        {state?.error ? (
          <div className="mt-4 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {state.error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
            Comercio *
            <select
              name="providerId"
              required
              className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
              defaultValue=""
            >
              <option value="" disabled>
                Selecciona comercio
              </option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}{provider.handle ? ` · ${provider.handle}` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
            Título *
            <input
              name="title"
              required
              placeholder="Networking Night · The Hub"
              className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-base font-medium text-white outline-none focus:border-white/60"
            />
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
            Descripción
            <textarea
              name="description"
              rows={5}
              placeholder="Cuenta qué recibirá el cliente al abrir el evento en la app."
              className="mt-1 w-full resize-none border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
              Fecha *
              <input
                name="date"
                type="date"
                required
                defaultValue={tomorrowDate()}
                className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
              Hora *
              <input
                name="time"
                type="time"
                required
                defaultValue="19:00"
                className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
              Ciudad *
              <input
                name="city"
                required
                placeholder="Tegucigalpa"
                className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
              Lugar
              <input
                name="venue"
                placeholder="The Hub"
                className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
              />
            </label>
          </div>

          <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
            Dirección
            <input
              name="address"
              placeholder="Dirección visible para el cliente"
              className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
            />
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
            Imagen de portada URL
            <input
              name="coverImageUrl"
              type="url"
              placeholder="https://..."
              className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
            />
          </label>
        </div>
      </section>

      <section className="space-y-6">
        <div className="futuristic-panel p-5">
          <div className="eyebrow">Tickets</div>
          <h2 className="mt-1 text-xl font-semibold">Primer tipo de entrada</h2>
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
                Capacidad *
                <input
                  name="capacity"
                  value={capacity}
                  onChange={(event) => setCapacity(event.target.value.replace(/\D/g, ""))}
                  inputMode="numeric"
                  required
                  className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
                Cantidad tickets *
                <input
                  name="ticketTotal"
                  defaultValue={capacity || "100"}
                  inputMode="numeric"
                  required
                  className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
                />
              </label>
            </div>

            <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
              Nombre entrada
              <input
                name="ticketName"
                defaultValue="General"
                className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
              />
            </label>

            <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
              Precio HNL
              <input
                name="ticketPrice"
                value={price}
                onChange={(event) => setPrice(event.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
              />
            </label>

            <div className="border border-white/10 bg-white/[0.03] p-3 text-sm text-white/65">
              {ticketModeLabel}. Si el precio es 0, el evento se publica como gratuito.
            </div>
          </div>
        </div>

      </section>

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
            <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
              Estado
              <select
                name="status"
                defaultValue="published"
                className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
              >
                <option value="published">Publicar en la app</option>
                <option value="draft">Guardar borrador</option>
              </select>
            </label>

            <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
              Color
              <select
                name="themeColor"
                defaultValue={COLOR_OPTIONS[0]}
                className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-sm text-white outline-none focus:border-white/60"
              >
                {COLOR_OPTIONS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              disabled={isPending || providers.length === 0}
              className="w-full border border-white bg-white px-5 py-3 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90 disabled:opacity-50"
            >
              {isPending ? "Creando..." : "Crear evento y formulario"}
            </button>

            <p className="text-xs leading-5 text-white/45">
              Al crear, el evento y su formulario quedan asociados al comercio real. Si está publicado, aparecerá en la app cliente.
            </p>
          </div>
      </section>
    </form>
  );
}
