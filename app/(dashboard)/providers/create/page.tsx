import { PageHeader } from "@/components/PageHeader";
import { CreateComercioForm } from "./_components/CreateComercioForm";

export const metadata = { title: "Nuevo Comercio — Allons Admin" };

export default function CreateComercioPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Comercios"
        title="Nuevo Comercio"
        description="Crea la cuenta de un nuevo proveedor. Recibirán una contraseña temporal que deben cambiar al primer acceso."
      />
      <CreateComercioForm />
    </div>
  );
}
