"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

/** Mismos colores que ofrece la app mobile (`EVENT_THEME_COLORS`). */
const EVENT_THEME_COLORS = [
  "#F67010",
  "#8338EC",
  "#3A86FF",
  "#138A36",
  "#FF006E",
  "#FFBE0B",
  "#350B57",
  "#1C1B20",
];

type PreviewImage = {
  name: string;
  url: string;
};

/**
 * Banner del evento: igual que en el formulario de la app, la portada es la
 * primera imagen y el color sólo se ve cuando todavía no hay imágenes.
 */
export function EventBannerMediaField({ title }: { title: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<PreviewImage[]>([]);
  const [color, setColor] = useState(EVENT_THEME_COLORS[0]);

  useEffect(() => {
    const next = files.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setPreviews(next);

    return () => {
      next.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [files]);

  const clearFiles = () => {
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    // El input file es de sólo lectura: se vacía y el envío usa `next`.
    if (inputRef.current) {
      const transfer = new DataTransfer();
      next.forEach((file) => transfer.items.add(file));
      inputRef.current.files = transfer.files;
    }
  };

  const cover = previews[0];

  return (
    <div className="futuristic-panel p-5">
      <input type="hidden" name="themeColor" value={color} />

      <div className="eyebrow">Banner</div>
      <h2 className="mt-1 text-xl font-semibold">Portada, galería y color</h2>
      <p className="mt-2 text-sm leading-6 text-white/50">
        La primera imagen es la portada del evento; las demás van a la galería.
        Si no subes imágenes, la app muestra el color sólido.
      </p>

      <div
        className="relative mt-4 flex h-36 flex-col justify-between overflow-hidden rounded-2xl p-4"
        style={{ backgroundColor: color }}
      >
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover.url}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-black/35" />
          </>
        ) : null}
        <span className="relative text-[10px] font-bold uppercase tracking-wide text-white/70">
          Banner · vista previa
        </span>
        <span className="relative line-clamp-2 text-lg font-semibold text-white">
          {title.trim() || "Título del evento"}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EVENT_THEME_COLORS.map((option) => (
          <Button
            key={option}
            type="button"
            size="icon"
            aria-label={`Color ${option}`}
            aria-pressed={color === option}
            onClick={() => setColor(option)}
            className={
              color === option
                ? "size-7 border border-white ring-2 ring-white/40"
                : "size-7 border border-white/15 hover:border-white/40"
            }
            style={{ backgroundColor: option }}
          />
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        name="eventImages"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
        className="hidden"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" size="sm" onClick={() => inputRef.current?.click()}>
          Agregar imágenes
        </Button>
        {files.length > 0 ? (
          <Button type="button" size="sm" variant="outline" onClick={clearFiles}>
            Limpiar
          </Button>
        ) : null}
      </div>

      {previews.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-white/15 p-6 text-sm text-white/45">
          No has agregado imágenes todavía.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {previews.map((preview, index) => (
            <div
              key={`${preview.name}-${index}`}
              className="rounded-lg border border-white/12 bg-white/[0.03] p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={preview.name}
                className="h-28 w-full rounded object-cover"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/75">
                  {index === 0 ? "Portada" : `#${index + 1}`}
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-auto px-0"
                >
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
