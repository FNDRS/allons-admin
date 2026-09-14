import { submitDemoRegistration } from "@/app/(dashboard)/events/[eventId]/formulario/actions";
import { getAdminEvent } from "@/lib/admin/eventsApi";
import type { DemoEventFormField } from "@/lib/demoEventForms";
import { getDemoEventForm } from "@/lib/demoEventForms";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
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
          <div className="eyebrow">Registro web</div>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            {event.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            Completa la información solicitada por el comercio. Allons guardará este registro para el evento.
          </p>

          {query.error ? (
            <div className="mt-5 border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
              {query.error}
            </div>
          ) : null}

          <form action={action} className="mt-7 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nombre completo *</Label>
                <Input
                  name="attendeeName"
                  required
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <Label>Correo electrónico *</Label>
                <Input
                  name="attendeeEmail"
                  type="email"
                  required
                  placeholder="tu@correo.com"
                />
              </div>
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

            <Button type="submit" className="w-full" size="lg">
              Confirmar registro
            </Button>
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
      <div>
        <Label>{label}</Label>
        <NativeSelect name={name} required={field.required} defaultValue="">
          <option value="" disabled>
            Selecciona una opción
          </option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </NativeSelect>
      </div>
    );
  }

  if (field.kind === "boolean") {
    return (
      <label className="flex items-start gap-3 border border-white/12 bg-white/[0.03] p-4 text-sm text-white/75">
        <Checkbox
          name={name}
          required={field.required}
          className="mt-0.5"
        />
        <span>{label}</span>
      </label>
    );
  }

  return (
    <div>
      <Label>{label}</Label>
      <Input
        name={name}
        type={field.kind === "number" ? "number" : "text"}
        required={field.required}
      />
    </div>
  );
}
