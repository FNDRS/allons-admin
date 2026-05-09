"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Calendar,
  Gauge,
  LogOut,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: Gauge },
  { href: "/providers", label: "Proveedores", icon: Store },
  { href: "/users", label: "Usuarios", icon: Users },
  { href: "/events", label: "Eventos", icon: Calendar },
  { href: "/finance", label: "Finanzas", icon: Wallet },
] as const;

export function Sidebar({ adminEmail }: { adminEmail: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  };

  return (
    <aside className="hidden md:flex md:w-64 shrink-0 flex-col border-r border-white/5 bg-surface">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center font-bold">
          A
        </div>
        <div>
          <div className="text-sm font-bold leading-tight">Allons Admin</div>
          <div className="text-[11px] text-muted">Panel root</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/overview" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-primary text-white font-semibold"
                  : "text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-3 space-y-2">
        <div className="rounded-lg bg-white/5 px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-weak">
            Sesión
          </div>
          <div className="text-xs font-semibold truncate">{adminEmail}</div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted hover:bg-white/5 hover:text-danger"
        >
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
