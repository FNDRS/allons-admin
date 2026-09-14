"use server";

import {
  createDemoEventRegistration,
  getDemoEventForm,
  normalizeDemoFormFields,
  saveDemoEventForm,
} from "@/lib/demoEventForms";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseFieldsPayload(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return [];
  }
}

function redirectRegistrationError(eventId: string, message: string): never {
  redirect(
    `/registro/eventos/${encodeURIComponent(eventId)}/registro?error=${encodeURIComponent(message)}` as unknown as never,
  );
}

export async function saveDemoRegistrationForm(
  eventId: string,
  formData: FormData,
) {
  const fields = normalizeDemoFormFields(parseFieldsPayload(formData.get("fields")));
  await saveDemoEventForm(eventId, fields);
  revalidatePath(`/events/${eventId}/formulario`);
  revalidatePath(`/events/${eventId}/formulario/respuestas`);
  revalidatePath(`/registro/eventos/${eventId}`);
  revalidatePath(`/registro/eventos/${eventId}/registro`);
  redirect(`/events/${encodeURIComponent(eventId)}/formulario?saved=1` as unknown as never);
}

export async function submitDemoRegistration(
  eventId: string,
  formData: FormData,
) {
  const attendeeName = String(formData.get("attendeeName") ?? "").trim();
  const attendeeEmail = String(formData.get("attendeeEmail") ?? "")
    .trim()
    .toLowerCase();

  if (!attendeeName) {
    redirectRegistrationError(eventId, "Escribe tu nombre completo.");
  }
  if (!attendeeEmail || !attendeeEmail.includes("@")) {
    redirectRegistrationError(eventId, "Escribe un correo válido.");
  }

  const form = await getDemoEventForm(eventId);
  const answers = form.fields.map((field) => {
    const key = `field_${field.id}`;
    const raw = formData.get(key);
    const answer =
      field.kind === "boolean"
        ? raw === "on"
          ? "Sí"
          : "No"
        : String(raw ?? "").trim();

    if (field.required) {
      const missing = field.kind === "boolean" ? answer !== "Sí" : !answer;
      if (missing) {
        redirectRegistrationError(eventId, `Completa: ${field.label}.`);
      }
    }

    return {
      questionId: field.id,
      label: field.label,
      answer,
    };
  });

  await createDemoEventRegistration({
    eventId,
    attendeeName,
    attendeeEmail,
    answers,
  });
  revalidatePath(`/events/${eventId}/formulario/respuestas`);
  redirect(`/registro/eventos/${encodeURIComponent(eventId)}?registered=1` as unknown as never);
}
