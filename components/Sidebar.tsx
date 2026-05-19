"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Calendar,
  Gauge,
  LogOut,
  Bell,
  QrCode,
  Receipt,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: Gauge },
  { href: "/providers", label: "Proveedores", icon: Store },
  { href: "/users", label: "Usuarios", icon: Users },
  { href: "/events", label: "Eventos", icon: Calendar },
  { href: "/notifications", label: "Notificaciones", icon: Bell },
  { href: "/finance", label: "Finanzas", icon: Wallet },
  { href: "/refunds", label: "Reembolsos", icon: Receipt },
  { href: "/waitlist-qr", label: "Waitlist QR", icon: QrCode },
] as const;

export function Sidebar({ adminEmail }: { adminEmail: string }) {
  const pathname = usePathname();
  const { replace, refresh } = useRouter();

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    replace("/login");
    refresh();
  };

  return (
    <aside className="futuristic-panel relative z-10 hidden shrink-0 flex-col border-r md:flex md:w-72">
      <div className="flex items-center gap-3 px-5 py-6 border-b border-white/15">
        <Image
          src="/apple-touch-icon.png"
          alt="Allons icon"
          width={32}
          height={32}
          className="size-8 object-contain"
          priority
        />
        <div>
          <div className="text-sm font-semibold leading-tight uppercase tracking-[0.08em]">
            Allons Admin
          </div>
          <div className="eyebrow">
            Panel root
          </div>
        </div>
      </div>

      <nav className="flex-1 px-0 py-0">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/overview" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href as never}
              className={`flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3 text-sm transition ${
                active
                  ? "bg-white text-black font-medium"
                  : "text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={16} />
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4 space-y-2">
        <div className="bg-surfaceMuted/40 px-3 py-2.5 border border-white/10">
          <div className="eyebrow">
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
