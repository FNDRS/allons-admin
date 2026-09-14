import "server-only";

import {
  adminApiErrorMessage,
  createAdminEventRegistration,
  getAdminEventForm,
  listAdminEventRegistrations,
  saveAdminEventForm,
} from "@/lib/admin/eventsApi";
import {
  asFormFieldOptions,
  isFieldKind,
  type DemoEventFormField,
} from "@/lib/eventFormFields";

export {
  DEMO_FORM_FIELD_KINDS,
  normalizeDemoFormFields,
  type DemoEventFormField,
  type DemoFormFieldKind,
} from "@/lib/eventFormFields";

export interface DemoEventForm {
  eventId: string;
  fields: DemoEventFormField[];
  updatedAt: string;
}

export interface DemoEventRegistrationAnswer {
  questionId: string;
  label: string;
  answer: string;
}

export interface DemoEventRegistration {
  id: string;
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  answers: DemoEventRegistrationAnswer[];
  createdAt: string;
}

function mapFormFields(
  eventId: string,
  fields: Array<{
    id: string;
    label: string;
    kind: string;
    options: string[];
    required: boolean;
    sortOrder: number;
  }>,
): DemoEventForm {
  return {
    eventId,
    fields: fields.map((field): DemoEventFormField => ({
      id: field.id,
      label: field.label,
      kind: isFieldKind(field.kind) ? field.kind : "text",
      options: asFormFieldOptions(field.options),
      required: Boolean(field.required),
      sortOrder: Number(field.sortOrder ?? 0),
    })),
    updatedAt: fields.length ? new Date().toISOString() : new Date(0).toISOString(),
  };
}

export async function getDemoEventForm(eventId: string): Promise<DemoEventForm> {
  try {
    const form = await getAdminEventForm(eventId);
    return mapFormFields(eventId, form.fields);
  } catch (error) {
    console.warn("[eventForms] questions:", adminApiErrorMessage(error, "unknown"));
    return { eventId, fields: [], updatedAt: new Date(0).toISOString() };
  }
}

export async function saveDemoEventForm(
  eventId: string,
  fields: DemoEventFormField[],
) {
  const form = await saveAdminEventForm(
    eventId,
    fields.map((field) => ({
      id: field.id,
      label: field.label,
      kind: field.kind,
      options: field.options,
      required: field.required,
      sortOrder: field.sortOrder,
    })),
  );
  return mapFormFields(eventId, form.fields);
}

export async function listDemoEventRegistrations(eventId: string) {
  try {
    const { items } = await listAdminEventRegistrations(eventId);
    return items.map(
      (item): DemoEventRegistration => ({
        id: item.id,
        eventId,
        attendeeName: item.attendeeName,
        attendeeEmail: item.attendeeEmail,
        answers: item.answers,
        createdAt: item.createdAt,
      }),
    );
  } catch (error) {
    console.warn(
      "[eventForms] registrations:",
      adminApiErrorMessage(error, "unknown"),
    );
    return [];
  }
}

export async function createDemoEventRegistration(input: {
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  answers: DemoEventRegistrationAnswer[];
}) {
  return createAdminEventRegistration(input.eventId, {
    attendeeName: input.attendeeName,
    attendeeEmail: input.attendeeEmail,
    answers: input.answers,
  });
}

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function buildDemoEventRegistrationsCsv(eventId: string) {
  const [form, registrations] = await Promise.all([
    getDemoEventForm(eventId),
    listDemoEventRegistrations(eventId),
  ]);
  const headers = [
    "Fecha",
    "Nombre",
    "Correo",
    ...form.fields.map((field) => field.label),
  ];
  const rows = registrations.map((registration) => {
    const answers = new Map(
      registration.answers.map((answer) => [answer.questionId, answer.answer]),
    );
    return [
      registration.createdAt,
      registration.attendeeName,
      registration.attendeeEmail,
      ...form.fields.map((field) => answers.get(field.id) ?? ""),
    ];
  });
  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");
}
