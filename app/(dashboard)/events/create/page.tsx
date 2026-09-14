import { DashboardPage, DashboardScroll } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { CreateAdminEventForm } from "@/app/(dashboard)/events/create/_components/CreateAdminEventForm";
import { listProviderOptions } from "@/lib/admin/providerOptions";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CreateAdminEventPage() {
  const providers = await listProviderOptions();

  return (
    <DashboardPage>
      <PageHeader
        title="Nuevo evento"
        description="Backoffice interno: crea un evento real para un comercio y luego configura su formulario especial."
        action={
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/5"
          >
            <ArrowLeft size={14} />
            Eventos
          </Link>
        }
      />
      <DashboardScroll>
        {providers.length === 0 ? (
          <div className="mb-5 border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            No hay comercios disponibles. Crea un comercio primero en Proveedores.
          </div>
        ) : null}
        <CreateAdminEventForm providers={providers} />
      </DashboardScroll>
    </DashboardPage>
  );
}
