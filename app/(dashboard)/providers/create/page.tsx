import { PageHeader } from "@/components/PageHeader";
import { CreateComercioForm } from "./_components/CreateComercioForm";

export const metadata = { title: "Nuevo Comercio | Allons Admin" };

export default function CreateComercioPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Comercios"
        title="Nuevo Comercio"
        description="Alta de un comercio. Se manda un enlace de invitación al correo."
      />
      <CreateComercioForm />
    </div>
  );
}
