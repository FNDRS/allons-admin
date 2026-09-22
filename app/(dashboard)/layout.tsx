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
  // Use getClaims() (local JWT decode, 0ms) instead of getUser() (network).
  // Proxy already validated with getClaims - this is just a second guard.
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims as { email?: string } | null | undefined;
  const root = checkRoot(claims?.email);

  if (!root.ok) {
    redirect("/login");
  }

  return (
    <div className="futuristic-shell h-screen overflow-hidden bg-background md:flex">
      <Sidebar adminEmail={root.email} />
      <main className="relative z-10 flex h-full min-h-0 flex-1 flex-col overflow-hidden py-4 pl-4 md:py-8 md:pl-8">
        {children}
      </main>
    </div>
  );
}
