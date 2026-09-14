/**
 * Definición y validación de los campos del formulario del evento.
 *
 * Vive aparte de `demoEventForms` —que es `server-only` por el cliente de
 * Supabase— para que el editor del panel valide el JSON pegado con exactamente
 * las mismas reglas que aplica el servidor al guardarlo.
 */

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

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isFieldKind(value: unknown): value is DemoFormFieldKind {
  return (
    typeof value === "string" &&
    DEMO_FORM_FIELD_KINDS.includes(value as DemoFormFieldKind)
  );
}

export function asFormFieldOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((option) => cleanString(option, 120)).filter(Boolean);
}

/** Un campo sin pregunta se descarta: no hay nada que mostrarle al cliente. */
export function normalizeDemoFormFields(value: unknown): DemoEventFormField[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((raw, index): DemoEventFormField | null => {
      if (!isRecord(raw)) return null;
      const label = cleanString(raw.label, 160);
      if (!label) return null;

      const kind = isFieldKind(raw.kind) ? raw.kind : "text";
      const options = asFormFieldOptions(raw.options).slice(0, 20);

      return {
        id: cleanString(raw.id, 80) || `field-${index}`,
        label,
        kind,
        required: raw.required === true,
        options: kind === "select" ? (options.length ? options : ["Opción 1"]) : [],
        sortOrder: index,
      };
    })
    .filter((field): field is DemoEventFormField => field !== null);
}

/**
 * Texto pegado por el usuario → campos. Acepta tanto un arreglo de campos como
 * un objeto `{ fields: [...] }`, que es la forma en que se exporta.
 */
export function parseFormFieldsJson(
  raw: string,
): { fields: DemoEventFormField[]; error: null } | { fields: null; error: string } {
  const text = raw.trim();
  if (!text) return { fields: null, error: "Pega el JSON del formulario." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { fields: null, error: "El JSON no es válido: revisá comas y comillas." };
  }

  const list =
    Array.isArray(parsed) || !isRecord(parsed) ? parsed : parsed.fields;
  if (!Array.isArray(list)) {
    return {
      fields: null,
      error: 'Se espera un arreglo de campos o un objeto con la clave "fields".',
    };
  }

  const fields = normalizeDemoFormFields(list);
  if (fields.length === 0) {
    return {
      fields: null,
      error: 'Ningún campo válido: cada uno necesita al menos "label".',
    };
  }

  return { fields, error: null };
}

/** Lo que se muestra al exportar: sin `id` ni `sortOrder`, que se regeneran. */
export function toFormFieldsJson(fields: DemoEventFormField[]) {
  return JSON.stringify(
    {
      fields: fields
        .filter((field) => field.label.trim())
        .map((field) => ({
          label: field.label,
          kind: field.kind,
          required: field.required,
          ...(field.kind === "select" ? { options: field.options } : {}),
        })),
    },
    null,
    2,
  );
}
