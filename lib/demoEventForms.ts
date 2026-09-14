import "server-only";

import { randomUUID } from "node:crypto";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  asFormFieldOptions,
  isFieldKind,
  type DemoEventFormField,
} from "@/lib/eventFormFields";

// La definición y la validación viven en `eventFormFields` para que el editor
// del panel (cliente) pueda reutilizarlas; acá se re-exportan sin cambios.
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

function asString(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export async function getDemoEventForm(eventId: string): Promise<DemoEventForm> {
  const admin = createSupabaseServiceRoleClient();
  const { data, error } = await admin
    .from("event_questions")
    .select("id, label, kind, options, required, sort_order, created_at")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[eventForms] questions:", error.message);
    return { eventId, fields: [], updatedAt: new Date(0).toISOString() };
  }

  const fields = (data ?? []).map((row): DemoEventFormField => ({
    id: asString(row.id),
    label: asString(row.label),
    kind: isFieldKind(row.kind) ? row.kind : "text",
    options: asFormFieldOptions(row.options),
    required: Boolean(row.required),
    sortOrder: Number(row.sort_order ?? 0),
  }));

  return {
    eventId,
    fields,
    updatedAt: fields.length ? new Date().toISOString() : new Date(0).toISOString(),
  };
}

export async function saveDemoEventForm(
  eventId: string,
  fields: DemoEventFormField[],
) {
  const admin = createSupabaseServiceRoleClient();
  const normalized = fields.map((field, index) => ({ ...field, sortOrder: index }));

  const { error: deleteError } = await admin
    .from("event_questions")
    .delete()
    .eq("event_id", eventId);
  if (deleteError) throw new Error(deleteError.message);

  if (normalized.length > 0) {
    const { error: insertError } = await admin.from("event_questions").insert(
      normalized.map((field) => ({
        event_id: eventId,
        label: field.label,
        kind: field.kind,
        options: field.kind === "select" ? field.options : null,
        required: field.required,
        sort_order: field.sortOrder,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  }

  return getDemoEventForm(eventId);
}

export async function listDemoEventRegistrations(eventId: string) {
  const admin = createSupabaseServiceRoleClient();
  const { data: tickets, error: ticketError } = await admin
    .from("tickets")
    .select("id, created_at")
    .eq("event_id", eventId)
    .is("cancelled_at", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (ticketError) {
    console.warn("[eventForms] registrations tickets:", ticketError.message);
    return [];
  }

  const ticketRows = tickets ?? [];
  const ticketIds = ticketRows.map((ticket) => asString(ticket.id)).filter(Boolean);
  if (ticketIds.length === 0) return [];

  const [{ data: holders }, { data: answers }, form] = await Promise.all([
    admin
      .from("ticket_holders")
      .select("ticket_id, holder_name, holder_email")
      .in("ticket_id", ticketIds),
    admin
      .from("ticket_answers")
      .select("ticket_id, question_id, answer")
      .in("ticket_id", ticketIds),
    getDemoEventForm(eventId),
  ]);

  const holderByTicket = new Map(
    (holders ?? []).map((holder) => [asString(holder.ticket_id), holder]),
  );
  const fieldById = new Map(form.fields.map((field) => [field.id, field]));
  const answersByTicket = new Map<string, DemoEventRegistrationAnswer[]>();
  for (const answer of answers ?? []) {
    const ticketId = asString(answer.ticket_id);
    const questionId = asString(answer.question_id);
    const field = fieldById.get(questionId);
    const list = answersByTicket.get(ticketId) ?? [];
    list.push({
      questionId,
      label: field?.label ?? questionId,
      answer: asString(answer.answer),
    });
    answersByTicket.set(ticketId, list);
  }

  return ticketRows.map((ticket): DemoEventRegistration => {
    const ticketId = asString(ticket.id);
    const holder = holderByTicket.get(ticketId);
    return {
      id: ticketId,
      eventId,
      attendeeName: asString(holder?.holder_name) || "Invitado",
      attendeeEmail: asString(holder?.holder_email),
      answers: answersByTicket.get(ticketId) ?? [],
      createdAt: asString(ticket.created_at),
    };
  });
}

function ticketCode() {
  return `WEB-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

export async function createDemoEventRegistration(input: {
  eventId: string;
  attendeeName: string;
  attendeeEmail: string;
  answers: DemoEventRegistrationAnswer[];
}) {
  const admin = createSupabaseServiceRoleClient();
  const attendeeName = input.attendeeName.trim().slice(0, 160);
  const attendeeEmail = input.attendeeEmail.trim().toLowerCase().slice(0, 254);

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, title, theme_color")
    .eq("id", input.eventId)
    .maybeSingle();
  if (eventError || !event) {
    throw new Error(eventError?.message ?? "Evento no encontrado");
  }

  const { data: ticketType } = await admin
    .from("provider_event_ticket_types")
    .select("id, sold_count")
    .eq("event_id", input.eventId)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const ownerId = randomUUID();
  const { error: profileError } = await admin.from("profiles").insert({
    user_id: ownerId,
    full_name: attendeeName,
  });
  if (profileError) throw new Error(profileError.message);

  const { data: ticket, error: ticketError } = await admin
    .from("tickets")
    .insert({
      owner_id: ownerId,
      event_id: input.eventId,
      ticket_type_id: ticketType?.id ?? null,
      title: asString(event.title),
      theme_color: event.theme_color ?? null,
      attendee_count: 1,
      code: ticketCode(),
    })
    .select("id, created_at")
    .single();
  if (ticketError || !ticket) {
    throw new Error(ticketError?.message ?? "No se pudo crear el registro");
  }

  const { error: holderError } = await admin.from("ticket_holders").insert({
    ticket_id: ticket.id,
    holder_name: attendeeName,
    holder_email: attendeeEmail,
    holder_user_id: ownerId,
    accepted_at: new Date().toISOString(),
  });
  if (holderError) throw new Error(holderError.message);

  const answers = input.answers
    .map((answer) => ({
      ticket_id: ticket.id,
      question_id: answer.questionId,
      answer: answer.answer.trim().slice(0, 2000),
    }))
    .filter((answer) => answer.answer.length > 0);
  if (answers.length > 0) {
    const { error: answersError } = await admin.from("ticket_answers").insert(answers);
    if (answersError) throw new Error(answersError.message);
  }

  if (ticketType?.id) {
    await admin
      .from("provider_event_ticket_types")
      .update({ sold_count: Number(ticketType.sold_count ?? 0) + 1 })
      .eq("id", ticketType.id);
  }

  return {
    id: asString(ticket.id),
    eventId: input.eventId,
    attendeeName,
    attendeeEmail,
    answers: input.answers,
    createdAt: asString(ticket.created_at),
  } satisfies DemoEventRegistration;
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
