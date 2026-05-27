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
  const styles =
    tone === "success"
      ? "border-success/40 text-success hover:bg-success/10"
      : tone === "danger"
        ? "border-danger/40 text-danger hover:bg-danger/10"
        : "border-white/15 text-muted hover:bg-white/5";

  return (
    <form action={setEventStatus}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="revalidate" value={revalidatePath} />
      <button
        type="submit"
        className={`border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition ${styles}`}
      >
        {label}
      </button>
    </form>
  );
}
