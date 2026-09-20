import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { setEventKitPickup } from "@/lib/admin/eventActions";

/**
 * Edita el punto de retiro del kit desde el detalle del evento.
 *
 * Vive aquí y no sólo en la creación porque la logística del retiro cambia
 * después de publicar —se mueve el local, se corre la fecha— y sin esto la
 * única salida sería tocar la base a mano.
 */
export function EventKitPickupCard({
  eventId,
  kitPickupInfo,
  revalidatePath,
}: {
  eventId: string;
  kitPickupInfo: string | null;
  revalidatePath: string;
}) {
  return (
    <section className="futuristic-panel p-5">
      <div className="eyebrow">Kit</div>
      <h2 className="mt-1 text-xl font-semibold">Retiro de kit</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-white/50">
        Aparece en la app —en el evento y en el ticket— y en el correo de
        confirmación de compra. Guardarlo vacío lo quita de todos lados.
      </p>

      <form action={setEventKitPickup} className="mt-5 space-y-3">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="revalidate" value={revalidatePath} />
        <Textarea
          name="kitPickupInfo"
          defaultValue={kitPickupInfo ?? ""}
          rows={4}
          maxLength={2000}
          placeholder={
            "Ej. Mall Multiplaza, local 12.\nDel 1 al 3 de octubre, 10:00 a. m. a 7:00 p. m.\nPresenta tu identidad."
          }
        />
        <Button type="submit" size="sm" variant="brand">
          Guardar
        </Button>
      </form>
    </section>
  );
}
