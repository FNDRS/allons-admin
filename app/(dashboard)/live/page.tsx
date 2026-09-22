import { DashboardPage, DashboardScroll } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { LiveBoard } from "./_components/LiveBoard";

export const dynamic = "force-dynamic";

/**
 * Ventas al momento.
 *
 * Se sondea cada 5 segundos en vez de suscribirse por realtime: la tubería de
 * realtime existe, pero necesita revisar las políticas de lectura para que un
 * admin vea todas las filas. Esto funciona hoy y se siente igual de vivo.
 */
export default async function LivePage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId } = await searchParams;

  return (
    <DashboardPage>
      <PageHeader
        title="En vivo"
        description="Compras al momento, cupo por horario y lo que necesita acción."
      />
      <DashboardScroll>
        <LiveBoard eventId={eventId} />
      </DashboardScroll>
    </DashboardPage>
  );
}
