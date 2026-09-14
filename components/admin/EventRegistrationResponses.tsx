import type { DemoFormFieldKind } from "@/lib/eventFormFields";
import type { ReactNode } from "react";

export interface RegistrationAnswer {
  questionId: string;
  answer: string;
}

export interface RegistrationRow {
  id: string;
  attendeeName: string;
  attendeeEmail: string;
  createdAt: string;
  answers: RegistrationAnswer[];
}

export interface RegistrationField {
  id: string;
  label: string;
  kind: DemoFormFieldKind;
}

function formatDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("es-HN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.round(days / 30);
  return months === 1 ? "hace 1 mes" : `hace ${months} meses`;
}

function formatDateValue(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function answerParts(kind: DemoFormFieldKind, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (kind === "checkbox") {
    return trimmed.split(/\s*[,;]\s*|\.\s+/).filter(Boolean);
  }
  if (kind === "date") return [formatDateValue(trimmed)];
  return [trimmed];
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="futuristic-panel min-w-0 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-white">{children}</div>
    </div>
  );
}

function AnswerValue({
  kind,
  value,
}: {
  kind: DemoFormFieldKind;
  value: string;
}) {
  const parts = answerParts(kind, value);
  if (parts.length === 0) {
    return <span className="text-muted">-</span>;
  }
  if (kind === "checkbox" && parts.length > 1) {
    return (
      <ul className="flex flex-wrap gap-1.5">
        {parts.map((part) => (
          <li
            key={part}
            className="border border-white/15 px-2 py-0.5 text-xs text-white/80"
          >
            {part}
          </li>
        ))}
      </ul>
    );
  }
  return <p className="wrap-break-word text-sm text-white/85">{parts.join(", ")}</p>;
}

function RegistrationCard({
  index,
  total,
  fields,
  registration,
}: {
  index: number;
  total: number;
  fields: RegistrationField[];
  registration: RegistrationRow;
}) {
  const answers = new Map(
    registration.answers.map((answer) => [answer.questionId, answer.answer]),
  );
  const relative = formatRelative(registration.createdAt);

  return (
    <article className="futuristic-panel min-w-0">
      <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="shrink-0 pt-0.5 text-xs tabular-nums text-muted">
            #{total - index}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-white">
              {registration.attendeeName}
            </p>
            <p className="truncate text-sm text-white/70">
              {registration.attendeeEmail}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-xs text-muted sm:text-right">
          <p className="text-white/80">{formatDay(registration.createdAt)}</p>
          <p>
            {formatTime(registration.createdAt)}
            {relative ? ` · ${relative}` : ""}
          </p>
        </div>
      </header>

      {fields.length > 0 ? (
        <dl className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <div
              key={field.id}
              className={
                field.kind === "textarea"
                  ? "min-w-0 sm:col-span-2"
                  : "min-w-0"
              }
            >
              <dt className="text-[11px] leading-snug text-muted">
                {field.label}
              </dt>
              <dd className="mt-1">
                <AnswerValue
                  kind={field.kind}
                  value={answers.get(field.id) ?? ""}
                />
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="px-4 py-4 text-sm text-muted">
          Este registro no tiene campos extra.
        </p>
      )}
    </article>
  );
}

export function EventRegistrationResponses({
  fields,
  registrations,
}: {
  fields: RegistrationField[];
  registrations: RegistrationRow[];
}) {
  if (registrations.length === 0) {
    return (
      <div className="futuristic-panel px-4 py-12 text-center text-sm text-muted">
        Todavía no hay registros desde el formulario web.
      </div>
    );
  }

  const first = registrations[registrations.length - 1];
  const last = registrations[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Registros">{registrations.length.toLocaleString()}</Stat>
        <Stat label="Campos del formulario">{fields.length}</Stat>
        <Stat label="Primer registro">
          <p>{formatDay(first.createdAt)}</p>
          <p className="text-xs font-normal text-muted">
            {formatTime(first.createdAt)}
          </p>
        </Stat>
        <Stat label="Último registro">
          <p>{formatDay(last.createdAt)}</p>
          <p className="text-xs font-normal text-muted">
            {formatTime(last.createdAt)}
          </p>
        </Stat>
      </div>

      <ol className="space-y-3">
        {registrations.map((registration, index) => (
          <li key={registration.id}>
            <RegistrationCard
              index={index}
              total={registrations.length}
              fields={fields}
              registration={registration}
            />
          </li>
        ))}
      </ol>
    </div>
  );
}
