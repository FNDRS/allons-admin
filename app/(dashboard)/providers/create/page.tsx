import { DashboardPage, DashboardScroll } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { CreateComercioForm } from "./_components/CreateComercioForm";

export const metadata = { title: "Nuevo Comercio | Allons Admin" };

export default function CreateComercioPage() {
  return (
    <DashboardPage>
      <PageHeader title="Nuevo Comercio" />
      <DashboardScroll>
        <CreateComercioForm />
      </DashboardScroll>
    </DashboardPage>
  );
}
