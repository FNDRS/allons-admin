"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Dónde y cuándo se recoge el kit del evento.
 *
 * Es texto libre a propósito: cada organizador lo dice a su manera («Mall
 * Multiplaza, local 12, del 1 al 3 de octubre, con tu identidad»), y partirlo
 * en campos obligaría a inventar los que falten.
 */
export function EventKitPickupField({
  defaultValue = "",
}: {
  defaultValue?: string | null;
}) {
  return (
    <section className="futuristic-panel p-5">
      <div className="eyebrow">Kit</div>
      <h2 className="mt-1 text-xl font-semibold">Retiro de kit</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
        Opcional. Lo que escribas aquí aparece en la app —en el evento y en el
        ticket— y en el correo de confirmación de compra. Si el evento no
        entrega nada, déjalo vacío.
      </p>

      <div className="mt-5">
        <Label htmlFor="event-kit-pickup-info">Instrucciones de retiro</Label>
        <Textarea
          id="event-kit-pickup-info"
          name="kitPickupInfo"
          defaultValue={defaultValue ?? ""}
          rows={4}
          maxLength={2000}
          placeholder={
            "Ej. Mall Multiplaza, local 12.\nDel 1 al 3 de octubre, 10:00 a. m. a 7:00 p. m.\nPresenta tu identidad."
          }
        />
      </div>
    </section>
  );
}
