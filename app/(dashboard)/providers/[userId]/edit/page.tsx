import { EditProviderForm } from "@/app/(dashboard)/providers/[userId]/edit/_components/EditProviderForm";
import { DashboardPage, DashboardScroll } from "@/components/DashboardPage";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { getProviderDetail } from "@/lib/admin/providersApi";
import { getUserById } from "@/lib/admin/users";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditProviderPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const providerUser = await getUserById(userId);
  if (!providerUser || providerUser.role !== "provider") {
    notFound();
  }

  let profile;
  try {
    profile = (await getProviderDetail(userId)).profile;
  } catch {
    profile = null;
  }
  if (!profile) notFound();

  const title =
    profile.brandName ||
    providerUser.brandName ||
    providerUser.fullName ||
    "Proveedor";

  return (
    <DashboardPage>
      <PageHeader
        title="Editar proveedor"
        description={title}
        action={
          <Button asChild size="sm" variant="outline">
            <Link href={`/providers/${userId}`}>
              <ArrowLeft size={14} />
              Volver
            </Link>
          </Button>
        }
      />
      <DashboardScroll>
        <EditProviderForm userId={userId} profile={profile} />
      </DashboardScroll>
    </DashboardPage>
  );
}
