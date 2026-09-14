"use client";

import { Button } from "@/components/ui/button";
import {
  EVENT_IMAGE_ACCEPT,
  EVENT_IMAGE_MAX_COUNT,
  type UploadedEventImage,
} from "@/lib/admin/eventImages";
import { useRef, useState } from "react";

/** Paleta de banner del evento (`EVENT_THEME_COLORS` en allons-mobile). */
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

type GalleryImage = UploadedEventImage & { name: string };

/**
 * Banner del evento: la portada es la primera imagen, y el color sólido sólo
 * se ve mientras no haya imágenes.
 *
 * Las imágenes se suben apenas se eligen, contra `/api/admin/event-images`, y
 * al formulario sólo viajan sus URLs. Mandar los archivos por el Server Action
 * rompía con "Body exceeded 1 MB limit".
 */
export function EventBannerMediaField({ title }: { title: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [color, setColor] = useState(EVENT_THEME_COLORS[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setUploadError(null);

    const room = EVENT_IMAGE_MAX_COUNT - images.length;
    if (room <= 0) {
      setUploadError(`Máximo ${EVENT_IMAGE_MAX_COUNT} imágenes.`);
      return;
    }

    setIsUploading(true);
    // Una por una: así una imagen pesada no tumba a las demás y el error dice
    // cuál falló.
    for (const file of files.slice(0, room)) {
      const body = new FormData();
      body.append("file", file);
      try {
        const response = await fetch("/api/admin/event-images", {
          method: "POST",
          body,
        });
        const payload = (await response.json()) as
          | UploadedEventImage
          | { error: string };
        if (!response.ok || !("url" in payload)) {
          setUploadError(
            "error" in payload ? payload.error : `No se pudo subir ${file.name}.`,
          );
          continue;
        }
        setImages((current) => [...current, { ...payload, name: file.name }]);
      } catch {
        setUploadError(`No se pudo subir ${file.name}. Revisá la conexión.`);
      }
    }
    setIsUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeImage = async (image: GalleryImage) => {
    setImages((current) => current.filter((item) => item.path !== image.path));
    // El evento todavía no existe: si no se borra, el archivo queda huérfano.
    try {
      await fetch("/api/admin/event-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: image.path }),
      });
    } catch {
      // Un huérfano en storage no debe bloquear la creación del evento.
    }
  };

  const cover = images[0];

  return (
    <div className="futuristic-panel p-5">
      <input type="hidden" name="themeColor" value={color} />
      <input
        type="hidden"
        name="eventImages"
        value={JSON.stringify(
          images.map(({ url, path }) => ({ url, path })),
        )}
      />

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
          <button
            key={option}
            type="button"
            aria-label={`Color ${option}`}
            aria-pressed={color === option}
            onClick={() => setColor(option)}
            className={`size-7 rounded-lg border transition ${
              color === option
                ? "border-white ring-2 ring-white/40"
                : "border-white/15 hover:border-white/40"
            }`}
            style={{ backgroundColor: option }}
          />
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={EVENT_IMAGE_ACCEPT}
        multiple
        onChange={(event) =>
          void uploadFiles(Array.from(event.target.files ?? []))
        }
        className="hidden"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={isUploading || images.length >= EVENT_IMAGE_MAX_COUNT}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? "Subiendo…" : "Agregar imágenes"}
        </Button>
        {images.length > 0 ? (
          <span className="text-xs text-white/45">
            {images.length} de {EVENT_IMAGE_MAX_COUNT}
          </span>
        ) : null}
      </div>

      {uploadError ? (
        <p className="mt-2 text-xs text-red-300">{uploadError}</p>
      ) : null}

      {images.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-white/15 p-6 text-sm text-white/45">
          No has agregado imágenes todavía.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.path}
              className="rounded-lg border border-white/12 bg-white/[0.03] p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.name}
                className="h-28 w-full rounded object-cover"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/75">
                  {index === 0 ? "Portada" : `#${index + 1}`}
                </span>
                <button
                  type="button"
                  onClick={() => void removeImage(image)}
                  className="text-xs text-white/45 underline-offset-2 hover:text-white hover:underline"
                >
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
