"use client";

import {
  EVENT_CATEGORIES,
  EVENT_OTHER_CATEGORY,
  INTEREST_OPTIONS,
  isCatalogEventCategory,
} from "@/lib/eventCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

/**
 * Chips de categoría, iguales a `EventCategoryChips` del mobile: una sola
 * categoría por evento y «Otro» abre un campo libre.
 */
function categoryState(initial: string | null | undefined) {
  if (initial === undefined) {
    return { selected: INTEREST_OPTIONS[0] as string, custom: "" };
  }
  const name = initial.trim();
  if (!name) return { selected: "", custom: "" };
  if (isCatalogEventCategory(name)) return { selected: name, custom: "" };
  return { selected: EVENT_OTHER_CATEGORY, custom: name };
}

export function EventCategoryField({
  initial,
}: {
  /** Sin prop, el alta arranca en la primera categoría. Null: el evento no tiene. */
  initial?: string | null;
} = {}) {
  const [selected, setSelected] = useState(() => categoryState(initial).selected);
  const [custom, setCustom] = useState(() => categoryState(initial).custom);

  const isCustom = selected === EVENT_OTHER_CATEGORY;
  const value = isCustom ? custom.trim() : selected;

  return (
    <div className="futuristic-panel p-5">
      <input type="hidden" name="category" value={value} />

      <div className="eyebrow">Categoría</div>
      <h2 className="mt-1 text-xl font-semibold">Cómo se descubre el evento</h2>
      <p className="mt-2 text-sm leading-6 text-white/50">
        Se guarda como interés del evento: es lo que filtra el cliente al
        explorar.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {EVENT_CATEGORIES.map((category) => {
          const active = category === selected;
          return (
            <Button
              key={category}
              type="button"
              size="sm"
              variant={active ? "brand" : "secondary"}
              aria-pressed={active}
              onClick={() => setSelected(category)}
              className="normal-case tracking-normal"
            >
              {category}
            </Button>
          );
        })}
      </div>

      {isCustom ? (
        <div className="mt-4">
          <Label>Nombre de la categoría *</Label>
          <Input
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="Escribe la categoría"
          />
          {!custom.trim() ? (
            <p className="mt-1.5 text-xs text-amber-300">
              Escribe el nombre de la categoría.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
