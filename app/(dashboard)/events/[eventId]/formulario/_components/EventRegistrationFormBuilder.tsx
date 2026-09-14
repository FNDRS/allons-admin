"use client";

import { EventFormFieldsEditor } from "@/components/admin/EventFormFieldsEditor";
import type { DemoEventFormField } from "@/lib/demoEventForms";

type Props = {
  initialFields: DemoEventFormField[];
  saveAction: (formData: FormData) => void | Promise<void>;
};

export function EventRegistrationFormBuilder({
  initialFields,
  saveAction,
}: Props) {
  return (
    <form action={saveAction}>
      <EventFormFieldsEditor
        initialFields={initialFields}
        submitButton={
          <button
            type="submit"
            className="border border-white bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90"
          >
            Guardar formulario
          </button>
        }
      />
    </form>
  );
}
