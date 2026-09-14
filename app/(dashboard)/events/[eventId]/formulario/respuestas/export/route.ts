import { buildDemoEventRegistrationsCsv } from "@/lib/demoEventForms";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const csv = await buildDemoEventRegistrationsCsv(eventId);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="event-${eventId}-responses.csv"`,
    },
  });
}
