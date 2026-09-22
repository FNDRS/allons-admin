"use client";

import { Button } from "@/components/ui/button";
import {
  EVENT_IMAGE_MAX_COUNT,
  UPLOAD_CONFIGS,
  type UploadedFile,
} from "@/lib/admin/uploads";
import { cn } from "@/lib/utils";
import { ImagePlus, Images } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

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

const IMAGE_NAME = /\.(jpe?g|png|webp|heic|heif)$/i;

type GalleryImage = UploadedFile & { name: string };

function isImageFile(file: File) {
  return file.type.startsWith("image/") || IMAGE_NAME.test(file.name);
}

function initialGallery(images: { url: string }[]): GalleryImage[] {
  return images.map((image, index) => ({
    url: image.url,
    path: image.url,
    name: index === 0 ? "Portada actual" : `Imagen ${index + 1}`,
    persisted: true,
  }));
}

function useFileDrop(
  onFiles: (files: File[]) => void,
  disabled: boolean,
) {
  const [over, setOver] = useState(false);

  const bind = {
    onDragEnter: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (!disabled) setOver(true);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        return;
      }
      setOver(false);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setOver(false);
      if (disabled) return;
      const dropped = event.dataTransfer?.files;
      if (!dropped || dropped.length === 0) return;
      onFiles(Array.from(dropped));
    },
  };

  return { over, bind };
}

/**
 * Banner del evento: una portada y, aparte, la galería.
 *
 * Las imágenes se suben apenas se eligen, contra `/api/admin/uploads`, y
 * al formulario sólo viajan sus URLs. Mandar los archivos por el Server Action
 * rompía con "Body exceeded 1 MB limit".
 *
 * El arreglo guardado sigue el contrato de la API: la primera URL es la
 * portada y el resto es la galería.
 */
export function EventBannerMediaField({
  title,
  initialImages = [],
  initialColor,
}: {
  title: string;
  initialImages?: { url: string }[];
  initialColor?: string | null;
}) {
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const seeded = initialGallery(initialImages);
  const [cover, setCover] = useState<GalleryImage | null>(seeded[0] ?? null);
  const [gallery, setGallery] = useState<GalleryImage[]>(() => seeded.slice(1));
  const [color, setColor] = useState(() =>
    initialColor && /^#[0-9A-Fa-f]{6}$/.test(initialColor)
      ? initialColor
      : EVENT_THEME_COLORS[0],
  );
  const [uploadTarget, setUploadTarget] = useState<"cover" | "gallery" | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isUploading = uploadTarget !== null;
  const galleryRoom =
    EVENT_IMAGE_MAX_COUNT - (cover ? 1 : 0) - gallery.length;
  const ordered = cover ? [cover, ...gallery] : [];

  const forgetUnpersisted = async (image: GalleryImage | null) => {
    if (!image || image.persisted) return;
    try {
      await fetch("/api/admin/uploads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: image.path, kind: "event-image" }),
      });
    } catch {
      // Un huérfano en storage no debe bloquear la edición.
    }
  };

  const uploadOne = async (file: File): Promise<GalleryImage | null> => {
    const body = new FormData();
    body.append("file", file);
    body.append("kind", "event-image");
    try {
      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as UploadedFile | { error: string };
      if (!response.ok || !("url" in payload)) {
        setUploadError(
          "error" in payload ? payload.error : `No se pudo subir ${file.name}.`,
        );
        return null;
      }
      return { ...payload, name: file.name };
    } catch {
      setUploadError(`No se pudo subir ${file.name}. Revisá la conexión.`);
      return null;
    }
  };

  const uploadCover = async (files: File[]) => {
    const images = files.filter(isImageFile);
    if (images.length === 0) {
      setUploadError("La portada tiene que ser JPG, PNG, WebP o HEIC.");
      return;
    }
    setUploadError(
      images.length > 1
        ? "La portada es una sola imagen. El resto no se subió."
        : null,
    );
    setUploadTarget("cover");
    const uploaded = await uploadOne(images[0]);
    if (uploaded) {
      void forgetUnpersisted(cover);
      setCover(uploaded);
    }
    setUploadTarget(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const uploadGallery = async (files: File[]) => {
    const images = files.filter(isImageFile);
    if (images.length === 0) {
      setUploadError("La galería acepta JPG, PNG, WebP o HEIC.");
      return;
    }
    if (!cover) {
      setUploadError("Primero agrega la portada. Después van las fotos de la galería.");
      return;
    }
    if (galleryRoom <= 0) {
      setUploadError(`Máximo ${EVENT_IMAGE_MAX_COUNT} imágenes, contando la portada.`);
      return;
    }
    setUploadError(null);
    setUploadTarget("gallery");
    for (const file of images.slice(0, galleryRoom)) {
      const uploaded = await uploadOne(file);
      if (uploaded) {
        setGallery((current) => [...current, uploaded]);
      }
    }
    if (images.length > galleryRoom) {
      setUploadError(
        `Máximo ${EVENT_IMAGE_MAX_COUNT} imágenes, contando la portada.`,
      );
    }
    setUploadTarget(null);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const removeCover = () => {
    const current = cover;
    setCover(null);
    setUploadError(null);
    void forgetUnpersisted(current);
  };

  const removeGalleryImage = (image: GalleryImage) => {
    setGallery((current) => current.filter((item) => item.path !== image.path));
    void forgetUnpersisted(image);
  };

  const coverDrop = useFileDrop(
    (files) => void uploadCover(files),
    isUploading,
  );
  const galleryDrop = useFileDrop(
    (files) => void uploadGallery(files),
    isUploading,
  );

  return (
    <div className="futuristic-panel p-5">
      <input type="hidden" name="themeColor" value={color} />
      <input
        type="hidden"
        name="eventImages"
        value={JSON.stringify(
          ordered.map(({ url, path, persisted }) => ({
            url,
            path,
            ...(persisted ? { persisted: true } : {}),
          })),
        )}
      />

      <div className="eyebrow">Banner</div>
      <h2 className="mt-1 text-xl font-semibold">Portada, galería y color</h2>
      <p className="mt-2 text-sm leading-6 text-white/50">
        La portada es una imagen. La galería acepta varias. Si no hay portada,
        la app muestra el color sólido.
      </p>

      <div
        data-drop="cover"
        className={cn(
          "relative mt-4 flex h-36 flex-col justify-between overflow-hidden rounded-2xl p-4 transition",
          coverDrop.over && "ring-2 ring-white",
        )}
        style={{ backgroundColor: color }}
        {...coverDrop.bind}
      >
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover.url}
              alt=""
              className="pointer-events-none absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-black/35" />
          </>
        ) : null}
        <span className="relative text-[10px] font-bold uppercase tracking-wide text-white/70">
          {coverDrop.over ? "Suelta la portada" : "Banner · vista previa"}
        </span>
        <span className="relative line-clamp-2 text-lg font-semibold text-white">
          {coverDrop.over
            ? "Una sola imagen"
            : title.trim() || "Título del evento"}
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
            className={cn(
              "size-7 rounded-lg border transition",
              color === option
                ? "border-white ring-2 ring-white/40"
                : "border-white/15 hover:border-white/40",
            )}
            style={{ backgroundColor: option }}
          />
        ))}
      </div>

      <input
        ref={coverInputRef}
        type="file"
        accept={UPLOAD_CONFIGS["event-image"].accept}
        onChange={(event) =>
          void uploadCover(Array.from(event.target.files ?? []))
        }
        className="hidden"
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={isUploading}
          onClick={() => coverInputRef.current?.click()}
        >
          {uploadTarget === "cover"
            ? "Subiendo…"
            : cover
              ? "Cambiar portada"
              : "Elegir portada"}
        </Button>
        {cover ? (
          <Button type="button" size="sm" variant="ghost" onClick={removeCover}>
            Quitar portada
          </Button>
        ) : (
          <span className="text-xs text-white/45">
            Arrástrala sobre el banner.
          </span>
        )}
      </div>

      <div className="mt-6">
        <div className="text-sm font-medium">Galería</div>
        <p className="mt-1 text-xs leading-5 text-white/45">
          {cover
            ? `${gallery.length} de ${EVENT_IMAGE_MAX_COUNT - 1}. Arrastra varias fotos.`
            : "Disponible después de la portada."}
        </p>

        <input
          ref={galleryInputRef}
          type="file"
          accept={UPLOAD_CONFIGS["event-image"].accept}
          multiple
          onChange={(event) =>
            void uploadGallery(Array.from(event.target.files ?? []))
          }
          className="hidden"
        />

        <div
          data-drop="gallery"
          className={cn(
            "mt-3 rounded-2xl border border-dashed px-4 py-6 text-center transition",
            galleryDrop.over
              ? "border-white bg-white/8"
              : "border-white/15 bg-white/[0.03]",
            (!cover || galleryRoom <= 0) && "opacity-50",
          )}
          {...galleryDrop.bind}
        >
          <Images className="mx-auto size-5 text-white/55" />
          <p className="mt-2 text-sm text-white/80">
            {galleryDrop.over
              ? "Suelta las fotos"
              : gallery.length === 0
                ? "Arrastra las imágenes de la galería"
                : "Suelta más fotos aquí"}
          </p>
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isUploading || (cover !== null && galleryRoom <= 0)}
              onClick={() => {
                if (!cover) {
                  setUploadError(
                    "Primero agrega la portada. Después van las fotos de la galería.",
                  );
                  return;
                }
                galleryInputRef.current?.click();
              }}
            >
              <ImagePlus className="size-3.5" />
              {uploadTarget === "gallery" ? "Subiendo…" : "Agregar a la galería"}
            </Button>
          </div>
        </div>

        {gallery.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-3">
            {gallery.map((image, index) => (
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
                    {`#${index + 1}`}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeGalleryImage(image)}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {uploadError ? (
        <p className="mt-3 text-xs text-red-300">{uploadError}</p>
      ) : null}
      {gallery.length > 0 && !cover ? (
        <>
          <input
            aria-hidden
            tabIndex={-1}
            className="sr-only"
            required
            value=""
            onChange={() => undefined}
          />
          <p className="mt-3 text-xs text-red-300">
            Elige una portada para guardar la galería. Sin portada, esas fotos no
            se envían.
          </p>
        </>
      ) : null}
    </div>
  );
}
