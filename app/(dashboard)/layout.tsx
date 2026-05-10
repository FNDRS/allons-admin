import { Sidebar } from "@/components/Sidebar";
import { checkRoot } from "@/lib/role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const root = checkRoot(user?.email);

  if (!root.ok) {
    redirect("/login");
  }

  return (
    <div className="futuristic-shell min-h-screen bg-background md:flex">
      <Sidebar adminEmail={root.email} />
      <main className="relative z-10 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
