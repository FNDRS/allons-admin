"use client";

import {
  DEMO_FORM_FIELD_KINDS,
  needsOptions,
  parseFormFieldsJson,
  toFormFieldsJson,
  type DemoEventFormField,
  type DemoFormFieldKind,
} from "@/lib/eventFormFields";
import {
  ArrowDown,
  ArrowUp,
  Braces,
  CalendarDays,
  ChevronDown,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  initialFields: DemoEventFormField[];
  hiddenInputName?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
  submitButton?: ReactNode;
  className?: string;
};

const JSON_PLACEHOLDER = `{
  "fields": [
    { "label": "¿Cómo te enteraste?", "kind": "select", "required": true,
      "options": ["Instagram", "Un amigo", "Otro"] },
    { "label": "Restricciones alimentarias", "kind": "text", "required": false }
  ]
}`;

const FIELD_KIND_LABEL: Record<DemoFormFieldKind, string> = {
  text: "Texto corto",
  textarea: "Párrafo",
  number: "Número",
  date: "Fecha",
  select: "Desplegable",
  radio: "Opción única",
  checkbox: "Varias opciones",
  boolean: "Casilla de aceptación",
};

/** Ayuda del botón: qué elige el asistente con cada tipo. */
const FIELD_KIND_HINT: Record<DemoFormFieldKind, string> = {
  text: "Una línea",
  textarea: "Texto largo",
  number: "Sólo dígitos",
  date: "Calendario",
  select: "Elige una de la lista",
  radio: "Elige una, todas visibles",
  checkbox: "Puede elegir varias",
  boolean: "Acepta o no acepta",
};

/**
 * La pregunta nace vacía: un texto de relleno se publica tal cual si el usuario
 * no lo borra, y obliga a limpiar el campo antes de escribir.
 */
function newField(kind: DemoFormFieldKind): DemoEventFormField {
  return {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label: "",
    kind,
    required: true,
    options: needsOptions(kind) ? ["Opción 1", "Opción 2"] : [],
    sortOrder: 0,
  };
}

export function EventFormFieldsEditor({
  initialFields,
  hiddenInputName = "fields",
  eyebrow = "Campos",
  title = "Formulario del evento",
  description,
  emptyMessage = "Agrega campos para que el registro web los solicite.",
  submitButton,
  className,
}: Props) {
  const [fields, setFields] = useState<DemoEventFormField[]>(initialFields);
  /** Campo recién agregado, para llevarle el cursor a su input de pregunta. */
  const [fieldToFocus, setFieldToFocus] = useState<string | null>(null);
  /** Lo que `normalizeDemoFormFields` va a conservar al guardar. */
  const savedFields = fields.filter((field) => field.label.trim());

  /**
   * Texto crudo del input de opciones, por campo.
   *
   * Sin esto no se puede escribir una coma: el valor se re-derivaba de
   * `options.join(", ")`, y como al partir se descartan los tramos vacíos, la
   * coma recién tecleada desaparecía antes de poder escribir la opción
   * siguiente. Lo que se guarda sigue siendo la lista limpia.
   */
  const [optionsDrafts, setOptionsDrafts] = useState<Record<string, string>>({});

  const setOptionsText = (fieldId: string, text: string) => {
    setOptionsDrafts((current) => ({ ...current, [fieldId]: text }));
    updateField(fieldId, {
      options: text
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean),
    });
  };

  const [showJson, setShowJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [jsonApplied, setJsonApplied] = useState(false);

  const openJsonEditor = () => {
    setShowJson((current) => {
      // Al abrirlo se precarga lo que ya hay, para editar en vez de empezar de cero.
      if (!current) setJsonDraft(toFormFieldsJson(fields));
      setJsonError(null);
      setJsonApplied(false);
      return !current;
    });
  };

  /** Reemplaza la lista completa: el JSON es la fuente, no un agregado. */
  const applyJson = () => {
    const result = parseFormFieldsJson(jsonDraft);
    if (!result.fields) {
      setJsonError(result.error);
      setJsonApplied(false);
      return;
    }
    setFields(
      result.fields.map((field, index) => ({
        ...field,
        id: `field-${Date.now()}-${index}`,
      })),
    );
    // Los campos son otros: el texto en curso de las opciones ya no aplica.
    setOptionsDrafts({});
    setJsonError(null);
    setJsonApplied(true);
  };

  const addField = (kind: DemoFormFieldKind) => {
    const field = newField(kind);
    setFields((current) => [...current, field]);
    setFieldToFocus(field.id);
  };

  const updateField = (
    fieldId: string,
    patch: Partial<DemoEventFormField>,
  ) => {
    setFields((current) =>
      current.map((field) =>
        field.id === fieldId ? { ...field, ...patch } : field,
      ),
    );
  };

  const removeField = (fieldId: string) => {
    setFields((current) => current.filter((field) => field.id !== fieldId));
  };

  const moveField = (fieldId: string, direction: -1 | 1) => {
    setFields((current) => {
      const index = current.findIndex((field) => field.id === fieldId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [field] = next.splice(index, 1);
      next.splice(nextIndex, 0, field);
      return next;
    });
  };

  return (
    <div
      className={`grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] ${className ?? ""}`}
    >
      <div className="futuristic-panel p-5">
        <input type="hidden" name={hiddenInputName} value={JSON.stringify(fields)} />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="mt-1 text-xl font-semibold">{title}</h2>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
                {description}
              </p>
            ) : null}
          </div>
          {submitButton}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_FORM_FIELD_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => addField(kind)}
              className="flex flex-col items-start gap-0.5 rounded-md border border-white/20 px-3 py-2 text-left transition hover:bg-white/5"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-white">
                <Plus size={13} /> {FIELD_KIND_LABEL[kind]}
              </span>
              <span className="text-[11px] text-white/40">
                {FIELD_KIND_HINT[kind]}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openJsonEditor}
            aria-expanded={showJson}
          >
            <Braces size={14} /> {showJson ? "Cerrar JSON" : "Pegar o copiar JSON"}
          </Button>

          {showJson ? (
            <div className="mt-3 rounded-lg border border-white/12 bg-white/[0.03] p-4">
              <Label>JSON del formulario</Label>
              <Textarea
                value={jsonDraft}
                onChange={(event) => {
                  setJsonDraft(event.target.value);
                  setJsonError(null);
                  setJsonApplied(false);
                }}
                rows={10}
                spellCheck={false}
                className="font-mono text-xs"
                placeholder={JSON_PLACEHOLDER}
              />

              {jsonError ? (
                <p className="mt-2 text-xs text-red-300">{jsonError}</p>
              ) : jsonApplied ? (
                <p className="mt-2 text-xs text-emerald-300">
                  JSON aplicado: los campos de abajo son los que se van a guardar.
                </p>
              ) : (
                <p className="mt-2 text-xs leading-5 text-white/40">
                  Un arreglo de campos, o un objeto con la clave{" "}
                  <code className="text-white/60">fields</code>. Cada campo
                  necesita <code className="text-white/60">label</code>;{" "}
                  <code className="text-white/60">kind</code> puede ser text,
                  number, select o boolean (por defecto text), y{" "}
                  <code className="text-white/60">options</code> aplica solo a
                  select.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={applyJson}>
                  Aplicar JSON
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setJsonDraft(toFormFieldsJson(fields))}
                >
                  <Copy size={14} /> Cargar campos actuales
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 space-y-3">
          {fields.length === 0 ? (
            <div className="border border-dashed border-white/20 p-8 text-center text-sm text-muted">
              {emptyMessage}
            </div>
          ) : (
            fields.map((field, index) => (
              <div key={field.id} className="border border-white/12 bg-white/[0.03] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-white/45">
                    Campo {index + 1} · {FIELD_KIND_LABEL[field.kind]}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveField(field.id, -1)}
                      disabled={index === 0}
                      aria-label="Subir campo"
                    >
                      <ArrowUp size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => moveField(field.id, 1)}
                      disabled={index === fields.length - 1}
                      aria-label="Bajar campo"
                    >
                      <ArrowDown size={14} />
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeField(field.id)}
                      aria-label="Eliminar campo"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                <div className="grid items-start gap-3 md:grid-cols-[1fr_160px_auto]">
                  <div>
                    <Label>Pregunta</Label>
                    <Input
                      ref={(node) => {
                        if (!node || fieldToFocus !== field.id) return;
                        node.focus();
                        setFieldToFocus(null);
                      }}
                      value={field.label}
                      placeholder="Ej. ¿Cómo te enteraste del evento?"
                      onChange={(event) =>
                        updateField(field.id, { label: event.target.value })
                      }
                    />
                    {!field.label.trim() ? (
                      <p className="mt-1.5 text-xs text-amber-300">
                        Sin pregunta, este campo no se guarda.
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={field.kind}
                      onValueChange={(kind) => {
                        const next = kind as DemoFormFieldKind;
                        updateField(field.id, {
                          kind: next,
                          options:
                            next === "select" && field.options.length === 0
                              ? ["Opción 1", "Opción 2"]
                              : next === "select"
                                ? field.options
                                : [],
                        });
                      }}
                    >
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="number">Número</SelectItem>
                      <SelectItem value="select">Selección</SelectItem>
                      <SelectItem value="boolean">Sí / No</SelectItem>
                    </Select>
                  </div>

                  <div>
                    <Label className="invisible" aria-hidden>
                      Obligatorio
                    </Label>
                    <label className="flex h-9 items-center gap-2 whitespace-nowrap text-sm text-white/75">
                      <Checkbox
                        checked={field.required}
                        onCheckedChange={(required) =>
                          updateField(field.id, { required })
                        }
                      />
                      Obligatorio
                    </label>
                  </div>
                </div>

                {needsOptions(field.kind) ? (
                  <div className="mt-3">
                    <Label>Opciones separadas por coma</Label>
                    <Input
                      value={optionsDrafts[field.id] ?? field.options.join(", ")}
                      onChange={(event) => setOptionsText(field.id, event.target.value)}
                      placeholder="S, M, L, XL"
                    />
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      <aside className="futuristic-panel p-5">
        <div className="eyebrow">Vista previa</div>
        <h2 className="mt-1 text-xl font-semibold">Registro web</h2>
        <div className="mt-5 space-y-4">
          <PreviewInput label="Nombre completo" required />
          <PreviewInput label="Correo electrónico" required />
          {/* La vista previa muestra lo que se va a publicar: un campo sin
              pregunta se descarta al guardar, así que tampoco aparece acá. */}
          {savedFields.length === 0 ? (
            <p className="border border-dashed border-white/15 p-4 text-sm text-muted">
              El registro web solo pedirá nombre y correo hasta que agregues campos.
            </p>
          ) : (
            savedFields.map((field) => (
              <PreviewInput
                key={field.id}
                label={field.label}
                required={field.required}
                kind={field.kind}
                options={field.options}
              />
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function PreviewInput({
  label,
  required,
  kind = "text",
  options = [],
}: {
  label: string;
  required?: boolean;
  kind?: DemoFormFieldKind;
  options?: string[];
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-white/45">
        {label} {required ? "*" : ""}
      </div>
      {kind === "select" ? (
        // Un desplegable se ve cerrado, pero listamos lo que contiene: la vista
        // previa existe para revisar las opciones cargadas.
        <div className="space-y-1">
          <div className="flex items-center justify-between border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white/60">
            <span>{options[0] ?? "Selecciona"}</span>
            <ChevronDown size={14} className="text-white/35" />
          </div>
          {options.length > 1 ? (
            <p className="text-[11px] text-white/35">
              {options.length} opciones: {options.join(" · ")}
            </p>
          ) : null}
        </div>
      ) : kind === "radio" || kind === "checkbox" ? (
        <div className="space-y-1.5">
          {options.map((option) => (
            <div key={option} className="flex items-center gap-2 text-sm text-white/70">
              <span
                className={`size-4 shrink-0 border border-white/30 ${
                  kind === "radio" ? "rounded-full" : "rounded-[4px]"
                }`}
              />
              {option}
            </div>
          ))}
          {options.length === 0 ? (
            <p className="text-[11px] text-amber-300">Agrega al menos una opción.</p>
          ) : null}
        </div>
      ) : kind === "boolean" ? (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <Checkbox disabled /> {label || "Acepto"}
        </div>
      ) : kind === "textarea" ? (
        <div className="h-20 border border-white/15 bg-white/[0.03]" />
      ) : kind === "date" ? (
        <div className="flex items-center justify-between border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white/40">
          <span>dd / mm / aaaa</span>
          <CalendarDays size={14} className="text-white/35" />
        </div>
      ) : (
        <div className="h-10 border border-white/15 bg-white/[0.03]" />
      )}
    </div>
  );
}
