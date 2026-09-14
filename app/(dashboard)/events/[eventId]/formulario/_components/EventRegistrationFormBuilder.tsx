"use client";

import type {
  DemoEventFormField,
  DemoFormFieldKind,
} from "@/lib/demoEventForms";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

type Props = {
  initialFields: DemoEventFormField[];
  saveAction: (formData: FormData) => void | Promise<void>;
};

const FIELD_KIND_LABEL: Record<DemoFormFieldKind, string> = {
  text: "Texto",
  number: "Número",
  select: "Selección",
  boolean: "Sí / No",
};

function newField(kind: DemoFormFieldKind): DemoEventFormField {
  return {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label:
      kind === "select"
        ? "Selecciona una opción"
        : kind === "boolean"
          ? "Acepto las condiciones"
          : "Nueva pregunta",
    kind,
    required: true,
    options: kind === "select" ? ["Opción 1", "Opción 2"] : [],
    sortOrder: 0,
  };
}

export function EventRegistrationFormBuilder({
  initialFields,
  saveAction,
}: Props) {
  const [fields, setFields] = useState<DemoEventFormField[]>(initialFields);

  const addField = (kind: DemoFormFieldKind) => {
    setFields((current) => [...current, newField(kind)]);
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
      <form action={saveAction} className="futuristic-panel p-5">
        <input type="hidden" name="fields" value={JSON.stringify(fields)} />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="eyebrow">Campos</div>
            <h2 className="mt-1 text-xl font-semibold">Formulario del evento</h2>
          </div>
          <button
            type="submit"
            className="border border-white bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90"
          >
            Guardar formulario
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-4">
          {(["text", "number", "select", "boolean"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => addField(kind)}
              className="flex items-center justify-center gap-2 border border-white/15 bg-white/[0.03] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/8"
            >
              <Plus size={14} /> {FIELD_KIND_LABEL[kind]}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-3">
          {fields.length === 0 ? (
            <div className="border border-dashed border-white/20 p-8 text-center text-sm text-muted">
              Agrega campos para que el registro web los solicite.
            </div>
          ) : (
            fields.map((field, index) => (
              <div key={field.id} className="border border-white/12 bg-white/[0.03] p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs font-bold uppercase tracking-wide text-white/45">
                    Campo {index + 1} · {FIELD_KIND_LABEL[field.kind]}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => moveField(field.id, -1)}
                      disabled={index === 0}
                      className="border border-white/15 p-2 text-white/70 transition hover:bg-white/5 disabled:opacity-30"
                      aria-label="Subir campo"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(field.id, 1)}
                      disabled={index === fields.length - 1}
                      className="border border-white/15 p-2 text-white/70 transition hover:bg-white/5 disabled:opacity-30"
                      aria-label="Bajar campo"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField(field.id)}
                      className="border border-red-500/30 p-2 text-red-300 transition hover:bg-red-500/10"
                      aria-label="Eliminar campo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_160px_140px]">
                  <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
                    Pregunta
                    <input
                      value={field.label}
                      onChange={(event) =>
                        updateField(field.id, { label: event.target.value })
                      }
                      className="mt-1 w-full border border-white/15 bg-black px-3 py-2 text-sm font-medium text-white outline-none transition focus:border-white/60"
                    />
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-wide text-white/45">
                    Tipo
                    <select
                      value={field.kind}
                      onChange={(event) => {
                        const kind = event.target.value as DemoFormFieldKind;
                        updateField(field.id, {
                          kind,
                          options:
                            kind === "select" && field.options.length === 0
                              ? ["Opción 1", "Opción 2"]
                              : kind === "select"
                                ? field.options
                                : [],
                        });
                      }}
                      className="mt-1 w-full border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-white/60"
                    >
                      <option value="text">Texto</option>
                      <option value="number">Número</option>
                      <option value="select">Selección</option>
                      <option value="boolean">Sí / No</option>
                    </select>
                  </label>

                  <label className="flex items-end gap-2 pb-2 text-sm text-white/75">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(event) =>
                        updateField(field.id, { required: event.target.checked })
                      }
                      className="size-4 accent-white"
                    />
                    Obligatorio
                  </label>
                </div>

                {field.kind === "select" ? (
                  <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-white/45">
                    Opciones separadas por coma
                    <input
                      value={field.options.join(", ")}
                      onChange={(event) =>
                        updateField(field.id, {
                          options: event.target.value
                            .split(",")
                            .map((option) => option.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="S, M, L, XL"
                      className="mt-1 w-full border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-white/60"
                    />
                  </label>
                ) : null}
              </div>
            ))
          )}
        </div>
      </form>

      <aside className="futuristic-panel p-5">
        <div className="eyebrow">Vista previa</div>
        <h2 className="mt-1 text-xl font-semibold">Registro web</h2>
        <div className="mt-5 space-y-4">
          <PreviewInput label="Nombre completo" required />
          <PreviewInput label="Correo electrónico" required />
          {fields.length === 0 ? (
            <p className="border border-dashed border-white/15 p-4 text-sm text-muted">
              La demo pública solo pedirá nombre y correo hasta que agregues campos.
            </p>
          ) : (
            fields.map((field) => (
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
        <div className="border border-white/15 bg-white/[0.03] px-3 py-2 text-sm text-white/60">
          {options[0] ?? "Selecciona"}
        </div>
      ) : kind === "boolean" ? (
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span className="size-4 border border-white/30" /> Sí
        </div>
      ) : (
        <div className="h-10 border border-white/15 bg-white/[0.03]" />
      )}
    </div>
  );
}
