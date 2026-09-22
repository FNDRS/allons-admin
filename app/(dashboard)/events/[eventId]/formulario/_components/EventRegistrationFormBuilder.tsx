"use client";

import { EventFormFieldsEditor } from "@/components/admin/EventFormFieldsEditor";
import { Button } from "@/components/ui/button";
import type { DemoEventFormField } from "@/lib/eventFormFields";

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
          <Button type="submit" size="sm">
            Guardar formulario
          </Button>
        }
      />
    </form>
  );
}
