"use client";

import { Button } from "@/components/ui/button";
import {
  HONDURAS_BOUNDS,
  isInsideHonduras,
  resolveKnownCity,
} from "@/lib/hondurasLocations";
import {
  isShortGoogleMapsLink,
  parseGoogleMapsLink,
} from "@/lib/googleMapsLink";
import { findPlusCode, resolvePlusCode } from "@/lib/plusCode";
import { Input } from "@/components/ui/input";
import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_CENTER = { latitude: 14.0723, longitude: -87.1921 };
const GEOCODE_DEBOUNCE_MS = 550;
const UNRESOLVED_ADDRESS = "Punto exacto en el mapa (sin dirección)";

/** El pin del marcador arrastrable; `iconAnchor` lo cuelga de la punta. */
const EVENT_PIN_HTML = `
<svg width="40" height="48" viewBox="-2 -2 40 48" fill="none" aria-hidden
     style="filter: drop-shadow(0 4px 8px rgba(0,0,0,.6)); cursor: grab;">
  <path d="M18 0C8.06 0 0 8.06 0 18c0 13.5 18 24 18 24s18-10.5 18-24C36 8.06 27.94 0 18 0Z"
        fill="#F67010" stroke="white" stroke-width="2" />
  <circle cx="18" cy="18" r="6.5" fill="white" />
</svg>`;

type Coords = { latitude: number; longitude: number };

function formatCoord(n: number) {
  return String(Number(n.toFixed(6)));
}

async function reverseGeocode(coords: Coords): Promise<{ address: string; city: string | null }> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error("geocode failed");
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const addr = data.address ?? {};
    // Build a readable address similar to mobile's formatGeocodedAddress
    const parts: string[] = [];
    const candidates = [
      addr.road,
      addr.pedestrian,
      addr.footway,
      addr.suburb,
      addr.neighbourhood,
      addr.city,
      addr.town,
      addr.village,
      addr.county,
      addr.state,
    ];
    for (const raw of candidates) {
      const p = raw?.trim();
      if (!p) continue;
      const prev = parts[parts.length - 1];
      if (prev && prev.toLowerCase() === p.toLowerCase()) continue;
      parts.push(p);
    }
    // Fallback to display_name first chunk if parts empty
    const address = parts.length > 0 ? parts.join(", ") : (data.display_name?.split(",").slice(0, 3).join(", ").trim() ?? "");
    const cityFromNominatim =
      addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? null;
    const city =
      resolveKnownCity({
        parts: [cityFromNominatim, addr.suburb, addr.county, address],
        latitude: coords.latitude,
        longitude: coords.longitude,
      }) ?? null;
    return { address, city };
  } catch {
    return {
      address: "",
      city: resolveKnownCity({ latitude: coords.latitude, longitude: coords.longitude }),
    };
  }
}

export function EventLocationPickerField({
  initial,
}: {
  initial?: {
    latitude: number;
    longitude: number;
    address?: string | null;
    city?: string | null;
  };
} = {}) {
  const mapElRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const startRef = useRef<Coords>(
    initial
      ? { latitude: initial.latitude, longitude: initial.longitude }
      : DEFAULT_CENTER,
  );
  const keepSavedAddress = useRef(
    Boolean(initial && (initial.address || initial.city)),
  );

  const [coords, setCoords] = useState<Coords>(startRef.current);
  const [addressPreview, setAddressPreview] = useState(initial?.address ?? "");
  const [detectedCity, setDetectedCity] = useState<string | null>(
    initial?.city ?? null,
  );
  const [isResolving, setIsResolving] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [linkDraft, setLinkDraft] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isResolvingLink, setIsResolvingLink] = useState(false);

  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const previewCoordsRef = useRef<Coords | null>(null);

  const scheduleReverseGeocode = useCallback(
    (next: Coords, delay = GEOCODE_DEBOUNCE_MS) => {
      if (
        previewCoordsRef.current &&
        Math.abs(previewCoordsRef.current.latitude - next.latitude) < 0.00008 &&
        Math.abs(previewCoordsRef.current.longitude - next.longitude) < 0.00008
      ) {
        setIsResolving(false);
        return;
      }
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      const req = ++requestIdRef.current;
      pendingTimer.current = setTimeout(async () => {
        setIsResolving(true);
        const result = await reverseGeocode(next);
        if (requestIdRef.current !== req) return;
        previewCoordsRef.current = next;
        setAddressPreview(result.address);
        // city may come from nominatim; fallback to nearest city
        const city =
          result.city ??
          resolveKnownCity({
            parts: [result.address],
            latitude: next.latitude,
            longitude: next.longitude,
          });
        setDetectedCity(city);
        setIsResolving(false);
      }, delay);
    },
    [],
  );

  // initial reverse geocode
  useEffect(() => {
    if (!keepSavedAddress.current) {
      scheduleReverseGeocode(startRef.current, 0);
    }
    return () => {
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      requestIdRef.current++;
    };
  }, [scheduleReverseGeocode]);

  // init leaflet map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");

      if (cancelled || !mapElRef.current || mapRef.current) return;

      const map = L.map(mapElRef.current, {
        center: [startRef.current.latitude, startRef.current.longitude],
        zoom: 13,
        zoomControl: true,
        // keep inside Honduras
        maxBounds: L.latLngBounds(
          [HONDURAS_BOUNDS.minLatitude, HONDURAS_BOUNDS.minLongitude],
          [HONDURAS_BOUNDS.maxLatitude, HONDURAS_BOUNDS.maxLongitude],
        ),
        maxBoundsViscosity: 0.9,
        minZoom: 7,
        maxZoom: 18,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // fix leaflet default icon path (not needed for center pin, but avoids 404)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const iconDefault = (L as any).Icon.Default.prototype as { _getIconUrl?: unknown };
      delete iconDefault._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // El pin es un marcador propio y arrastrable: mover el mapa ya no cambia
      // la ubicación, sólo el encuadre. Se arrastra el pin, o se hace clic.
      const marker = L.marker(
        [startRef.current.latitude, startRef.current.longitude],
        {
          draggable: true,
          autoPan: true,
          keyboard: true,
          title: "Arrastra el pin hasta el lugar del evento",
          icon: L.divIcon({
            className: "",
            html: EVENT_PIN_HTML,
            iconSize: [40, 48],
            // La punta del alfiler es el punto que se guarda.
            iconAnchor: [20, 44],
          }),
        },
      ).addTo(map);

      const commit = (latlng: import("leaflet").LatLng) => {
        const next = { latitude: latlng.lat, longitude: latlng.lng };
        setCoords(next);
        scheduleReverseGeocode(next);
      };

      marker.on("dragend", () => commit(marker.getLatLng()));
      map.on("click", (e: import("leaflet").LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        commit(e.latlng);
      });

      markerRef.current = marker;
      mapRef.current = map;
      setMapReady(true);

      // ensure size is correct after mount
      setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      if (pendingTimer.current) clearTimeout(pendingTimer.current);
      requestIdRef.current++;
      markerRef.current = null;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [scheduleReverseGeocode]);

  const inside = isInsideHonduras(coords.latitude, coords.longitude);

  /** Mueve el pin y el encuadre a un punto elegido fuera del mapa. */
  const movePinTo = useCallback(
    (next: Coords, zoom?: number) => {
      markerRef.current?.setLatLng([next.latitude, next.longitude]);
      mapRef.current?.setView(
        [next.latitude, next.longitude],
        zoom ?? mapRef.current.getZoom(),
        { animate: true },
      );
      setCoords(next);
      scheduleReverseGeocode(next, 0);
    },
    [scheduleReverseGeocode],
  );

  const applyGoogleMapsLink = useCallback(async () => {
    const raw = linkDraft.trim();
    if (!raw) {
      setLinkError("Pega el link de Google Maps.");
      return;
    }

    setLinkError(null);
    let next = parseGoogleMapsLink(raw);
    const needsLookup =
      !next && (isShortGoogleMapsLink(raw) || Boolean(findPlusCode(raw)));

    if (needsLookup) {
      setIsResolvingLink(true);
      try {
        // Los links de "Compartir" son cortos y hay que seguir el redirect; eso
        // sólo se puede hacer desde el servidor porque Google no manda CORS.
        if (isShortGoogleMapsLink(raw)) {
          const response = await fetch("/api/maps/resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: raw }),
          });
          if (response.ok) {
            next = (await response.json()) as Coords;
          }
        }
        if (!next && findPlusCode(raw)) {
          const plus = await resolvePlusCode(raw);
          if (plus && "error" in plus) {
            setLinkError(plus.error);
            return;
          }
          if (plus && "latitude" in plus) next = plus;
        }
      } catch {
        // Se reporta abajo como texto no legible.
      } finally {
        setIsResolvingLink(false);
      }
    }

    if (!next) {
      setLinkError(
        "No encontramos coordenadas. Pega el link de Google Maps, un Plus Code con la ciudad, o las coordenadas «14.0723, -87.1921».",
      );
      return;
    }
    if (!isInsideHonduras(next.latitude, next.longitude)) {
      setLinkError("Ese punto está fuera de Honduras.");
      return;
    }

    movePinTo(next, 16);
    setLinkDraft("");
  }, [linkDraft, movePinTo]);

  const centerToMyLocation = useCallback(async () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        if (!isInsideHonduras(next.latitude, next.longitude)) return;
        movePinTo(next, 15);
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [movePinTo]);

  return (
    <div className="futuristic-panel p-5">
      {/* hidden fields for server action */}
      <input type="hidden" name="city" value={detectedCity ?? ""} />
      <input type="hidden" name="latitude" value={formatCoord(coords.latitude)} />
      <input type="hidden" name="longitude" value={formatCoord(coords.longitude)} />
      <input type="hidden" name="address" value={addressPreview} />

      <div className="eyebrow">Ubicación</div>
      <h2 className="mt-1 text-xl font-semibold">Pin en el mapa</h2>
      <p className="mt-2 text-sm leading-6 text-white/50">
        Arrastra el pin (o haz clic en el mapa) hasta el lugar exacto del evento
        en Honduras. También puedes pegar un link de Google Maps, un Plus Code
        o las coordenadas. La ciudad se detecta sola para búsqueda.
      </p>

      <div className="mt-4">
        <label
          htmlFor="event-maps-link"
          className="mb-1.5 block text-xs font-medium text-white/60"
        >
          Link, Plus Code o coordenadas
        </label>
        <div className="flex flex-wrap gap-2">
          <Input
            id="event-maps-link"
            value={linkDraft}
            onChange={(event) => {
              setLinkDraft(event.target.value);
              setLinkError(null);
            }}
            onKeyDown={(event) => {
              // Enter dentro de un form lo enviaría; acá sólo ubica el pin.
              if (event.key !== "Enter") return;
              event.preventDefault();
              void applyGoogleMapsLink();
            }}
            placeholder="CXXG+GMF, Chamelecon o 14.0723, -87.1921"
            className="min-w-56 flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void applyGoogleMapsLink()}
            disabled={isResolvingLink}
          >
            {isResolvingLink ? "Ubicando…" : "Ubicar pin"}
          </Button>
        </div>
        {linkError ? (
          <p className="mt-1.5 text-xs text-red-300">{linkError}</p>
        ) : null}
      </div>

      <div className="relative mt-4 overflow-hidden rounded-xl border border-white/15 bg-black">
        <div
          ref={mapElRef}
          className="h-[360px] w-full"
          style={{ background: "#0a0a0a" }}
        />
        {/*
          Leaflet numera sus panes desde z-index 400 y sus controles llegan a
          800, así que lo que va encima del mapa necesita z-index propio.
        */}
        {!mapReady ? (
          <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center bg-black/40 text-sm text-white/60">
            Cargando mapa…
          </div>
        ) : null}

        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={centerToMyLocation}
          className="absolute bottom-3 right-3 z-[1000] rounded-full bg-black/70 backdrop-blur hover:bg-black/90"
        >
          Mi ubicación
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/45">
        <span>
          Pin: {formatCoord(coords.latitude)}, {formatCoord(coords.longitude)}
        </span>
        <span className={isResolving ? "text-white/60" : "opacity-0"}>Buscando dirección…</span>
      </div>

      <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-white/40">
            Ubicación seleccionada
          </p>
          {isResolving ? <span className="size-3 animate-pulse rounded-full bg-[#F67010]" /> : null}
        </div>
        <p className="mt-1 line-clamp-2 text-sm font-medium text-white">
          {addressPreview || UNRESOLVED_ADDRESS}
        </p>
        <p className="mt-2 text-sm">
          {inside ? (
            detectedCity ? (
              <span className="text-emerald-300">Ciudad detectada: {detectedCity}</span>
            ) : (
              <span className="text-amber-300">Pin dentro de Honduras, pero sin ciudad reconocida — mueve el pin más cerca de una ciudad.</span>
            )
          ) : (
            <span className="text-red-300">El pin debe estar dentro de Honduras.</span>
          )}
        </p>
      </div>

      <p className="mt-3 text-xs leading-5 text-white/35">
        No hay campo de ciudad: se toma del pin al guardar, y es la que ven tus
        clientes al filtrar o buscar.
      </p>
    </div>
  );
}
