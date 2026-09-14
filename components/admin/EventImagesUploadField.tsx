"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

type PreviewImage = {
  name: string;
  url: string;
};

export function EventImagesUploadField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<PreviewImage[]>([]);

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

  return (
    <div className="futuristic-panel p-5">
      <div className="eyebrow">Imagenes</div>
      <h2 className="mt-1 text-xl font-semibold">Portada y galeria</h2>
      <p className="mt-2 text-sm leading-6 text-white/50">
        Sube varias imagenes como en la app. La primera sera la portada del
        evento; las demas se mostraran en la galeria.
      </p>

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
          Agregar imagenes
        </Button>
        {files.length > 0 ? (
          <Button type="button" size="sm" variant="outline" onClick={clearFiles}>
            Limpiar
          </Button>
        ) : null}
      </div>

      {previews.length === 0 ? (
        <div className="mt-4 border border-dashed border-white/15 p-6 text-sm text-white/45">
          No has agregado imagenes todavia.
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {previews.map((preview, index) => (
            <div key={`${preview.name}-${index}`} className="border border-white/12 bg-white/[0.03] p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview.url}
                alt={preview.name}
                className="h-32 w-full object-cover"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-xs text-white/55">
                  {preview.name}
                </span>
                <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white/75">
                  {index === 0 ? "Portada" : `#${index + 1}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
