import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const DEMO_FORM_FIELD_KINDS = [
  "text",
  "number",
  "select",
  "boolean",
] as const;

export type DemoFormFieldKind = (typeof DEMO_FORM_FIELD_KINDS)[number];

export interface DemoEventFormField {
  id: string;
  label: string;
  kind: DemoFormFieldKind;
  required: boolean;
  options: string[];
  sortOrder: number;
}

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

interface DemoEventFormsStore {
  forms: Record<string, DemoEventForm>;
  registrations: DemoEventRegistration[];
}

const STORE_PATH = path.join(
  process.cwd(),
  ".demo",
  "event-registration-forms.json",
);

function emptyStore(): DemoEventFormsStore {
  return { forms: {}, registrations: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readStore(): Promise<DemoEventFormsStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DemoEventFormsStore>;
    return {
      forms: isRecord(parsed.forms) ? parsed.forms as Record<string, DemoEventForm> : {},
      registrations: Array.isArray(parsed.registrations)
        ? parsed.registrations.filter(isRegistration)
        : [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyStore();
    }
    throw error;
  }
}

async function writeStore(store: DemoEventFormsStore) {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isFieldKind(value: unknown): value is DemoFormFieldKind {
  return (
    typeof value === "string" &&
    DEMO_FORM_FIELD_KINDS.includes(value as DemoFormFieldKind)
  );
}

function isRegistration(value: unknown): value is DemoEventRegistration {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.eventId === "string" &&
    typeof value.attendeeName === "string" &&
    typeof value.attendeeEmail === "string" &&
    typeof value.createdAt === "string" &&
    Array.isArray(value.answers)
  );
}

export function normalizeDemoFormFields(value: unknown): DemoEventFormField[] {
  if (!Array.isArray(value)) return [];

  const seenIds = new Set<string>();
  return value
    .map((raw, index): DemoEventFormField | null => {
      if (!isRecord(raw)) return null;
      const label = cleanString(raw.label, 160);
      if (!label) return null;

      const kind = isFieldKind(raw.kind) ? raw.kind : "text";
      const rawId = cleanString(raw.id, 80) || `field-${randomUUID()}`;
      const id = seenIds.has(rawId) ? `${rawId}-${index}` : rawId;
      seenIds.add(id);

      const options = Array.isArray(raw.options)
        ? raw.options
            .map((option) => cleanString(option, 120))
            .filter(Boolean)
            .slice(0, 20)
        : [];

      return {
        id,
        label,
        kind,
        required: raw.required === true,
        options: kind === "select" ? options.length ? options : ["Opción 1"] : [],
        sortOrder: index,
      };
    })
    .filter((field): field is DemoEventFormField => field !== null);
}

export async function getDemoEventForm(eventId: string): Promise<DemoEventForm> {
  const store = await readStore();
  const form = store.forms[eventId];
  if (!form) {
    return { eventId, fields: [], updatedAt: new Date(0).toISOString() };
  }
  return {
    ...form,
    fields: [...form.fields].sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function saveDemoEventForm(
  eventId: string,
  fields: DemoEventFormField[],
) {
  const store = await readStore();
  store.forms[eventId] = {
    eventId,
    fields: fields.map((field, index) => ({ ...field, sortOrder: index })),
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  return store.forms[eventId];
}

export async function listDemoEventRegistrations(eventId: string) {
  const store = await readStore();
  return store.registrations
    .filter((registration) => registration.eventId === eventId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createDemoEventRegistration(input: {
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  answers: DemoEventRegistrationAnswer[];
}) {
  const store = await readStore();
  const registration: DemoEventRegistration = {
    id: randomUUID(),
    eventId: input.eventId,
    attendeeName: input.attendeeName.trim().slice(0, 160),
    attendeeEmail: input.attendeeEmail.trim().toLowerCase().slice(0, 254),
    answers: input.answers.map((answer) => ({
      questionId: answer.questionId,
      label: answer.label.trim().slice(0, 160),
      answer: answer.answer.trim().slice(0, 2000),
    })),
    createdAt: new Date().toISOString(),
  };
  store.registrations.unshift(registration);
  await writeStore(store);
  return registration;
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
