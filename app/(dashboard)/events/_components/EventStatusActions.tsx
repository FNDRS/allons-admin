import { Button } from "@/components/ui/button";
import { setEventStatus } from "@/lib/admin/eventActions";

export function EventStatusActions({
  eventId,
  status,
  revalidatePath,
}: {
  eventId: string;
  status: string;
  revalidatePath: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {status !== "published" ? (
        <StatusActionButton
          eventId={eventId}
          status="published"
          label="Publicar"
          tone="success"
          revalidatePath={revalidatePath}
        />
      ) : null}
      {status !== "suspended" ? (
        <StatusActionButton
          eventId={eventId}
          status="suspended"
          label="Suspender"
          tone="danger"
          revalidatePath={revalidatePath}
        />
      ) : (
        <StatusActionButton
          eventId={eventId}
          status="published"
          label="Reactivar"
          tone="success"
          revalidatePath={revalidatePath}
        />
      )}
    </div>
  );
}

function StatusActionButton({
  eventId,
  status,
  label,
  tone,
  revalidatePath,
}: {
  eventId: string;
  status: string;
  label: string;
  tone: "success" | "danger" | "muted";
  revalidatePath: string;
}) {
  const variant =
    tone === "success"
      ? "success"
      : tone === "danger"
        ? "destructive"
        : "outline";

  return (
    <form action={setEventStatus}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="revalidate" value={revalidatePath} />
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
    </form>
  );
}
