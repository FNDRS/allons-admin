import { submitDemoRegistration } from "@/app/(dashboard)/events/[eventId]/formulario/actions";
import { getAdminEvent } from "@/lib/admin/eventsApi";
import type { DemoEventFormField } from "@/lib/demoEventForms";
import { getDemoEventForm } from "@/lib/demoEventForms";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DemoEventRegistrationPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventId } = await params;
  const query = await searchParams;

  let event: Awaited<ReturnType<typeof getAdminEvent>> | null = null;
  try {
    event = await getAdminEvent(eventId);
  } catch {
    notFound();
  }

  const form = await getDemoEventForm(eventId);
  const action = submitDemoRegistration.bind(null, eventId);

  return (
    <main className="min-h-screen bg-[#050505] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/demo/eventos/${eventId}` as never}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
        >
          <ArrowLeft size={14} />
          Volver al evento
        </Link>

        <section className="futuristic-panel p-6 sm:p-8">
          <div className="eyebrow">Registro demo</div>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            {event.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Completa la información solicitada para esta demostración web. No se emite ticket real.
          </p>

          {query.error ? (
            <div className="mt-5 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {query.error}
            </div>
          ) : null}

          <form action={action} className="mt-7 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
                Nombre completo *
                <input
                  name="attendeeName"
                  required
                  className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-base font-medium text-white outline-none transition focus:border-white/60"
                  placeholder="Tu nombre"
                />
              </label>
              <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
                Correo electrónico *
                <input
                  name="attendeeEmail"
                  type="email"
                  required
                  className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-base font-medium text-white outline-none transition focus:border-white/60"
                  placeholder="tu@correo.com"
                />
              </label>
            </div>

            <div className="border-t border-white/10 pt-6">
              <div className="mb-4">
                <div className="eyebrow">Información del evento</div>
                <p className="mt-1 text-sm text-white/55">
                  {form.fields.length === 0
                    ? "Este evento todavía no tiene campos personalizados."
                    : "Estos campos fueron configurados desde Allons Admin."}
                </p>
              </div>
              <div className="space-y-4">
                {form.fields.map((field) => (
                  <DemoFieldInput key={field.id} field={field} />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full border border-white bg-white px-5 py-3 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90"
            >
              Confirmar registro
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function DemoFieldInput({ field }: { field: DemoEventFormField }) {
  const name = `field_${field.id}`;
  const label = `${field.label}${field.required ? " *" : ""}`;

  if (field.kind === "select") {
    return (
      <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
        {label}
        <select
          name={name}
          required={field.required}
          className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-base text-white outline-none transition focus:border-white/60"
          defaultValue=""
        >
          <option value="" disabled>
            Selecciona una opción
          </option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.kind === "boolean") {
    return (
      <label className="flex items-start gap-3 border border-white/12 bg-white/[0.03] p-4 text-sm text-white/75">
        <input
          name={name}
          type="checkbox"
          required={field.required}
          className="mt-0.5 size-4 accent-white"
        />
        <span>{label}</span>
      </label>
    );
  }

  return (
    <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
      {label}
      <input
        name={name}
        type={field.kind === "number" ? "number" : "text"}
        required={field.required}
        className="mt-1 w-full border border-white/15 bg-black px-3 py-3 text-base font-medium text-white outline-none transition focus:border-white/60"
      />
    </label>
  );
}
