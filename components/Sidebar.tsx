"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  FileText,
  Activity,
  Gauge,
  Loader2,
  LogOut,
  Bell,
  Menu,
  QrCode,
  Receipt,
  Store,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/overview", label: "Resumen", icon: Gauge },
  { href: "/live", label: "En vivo", icon: Activity },
  { href: "/providers", label: "Proveedores", icon: Store },
  { href: "/users", label: "Usuarios", icon: Users },
  { href: "/events", label: "Eventos", icon: Calendar },
  { href: "/notifications", label: "Notificaciones", icon: Bell },
  { href: "/finance", label: "Finanzas", icon: Wallet },
  { href: "/refunds", label: "Reembolsos", icon: Receipt },
  { href: "/waitlist-qr", label: "Waitlist QR", icon: QrCode },
] as const;

function NavIcon({ icon: Icon }: { icon: LucideIcon }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return <Loader2 size={16} className="animate-spin shrink-0" aria-hidden />;
  }
  return <Icon size={16} className="shrink-0" aria-hidden />;
}

function NavItem({
  item,
  active,
  onNavigate,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href as never}
      onClick={onNavigate}
      className={`flex items-center justify-between gap-3 border-b border-white/10 px-5 py-3 text-sm transition ${
        active
          ? "bg-white text-black font-medium"
          : "text-muted hover:bg-white/5 hover:text-white"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className="flex items-center gap-3">
        <NavIcon icon={item.icon} />
        {item.label}
      </span>
    </Link>
  );
}

export function Sidebar({ adminEmail }: { adminEmail: string }) {
  const pathname = usePathname();
  const { replace, refresh } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    replace("/login");
    refresh();
  };

  const brand = (
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
        <div className="eyebrow">Interno</div>
      </div>
    </div>
  );

  const links = (onNavigate?: () => void) => (
    <nav className="min-h-0 flex-1 overflow-y-auto px-0 py-0">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href ||
          (item.href !== "/overview" && pathname.startsWith(item.href));
        return (
          <NavItem
            key={item.href}
            item={item}
            active={active}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );

  const account = (
    <div className="border-t border-white/10 p-4 space-y-2">
      <div className="bg-surfaceMuted/40 px-3 py-2.5 border border-white/10">
        <div className="eyebrow">
          Sesión
        </div>
        <div className="text-xs font-semibold truncate">{adminEmail}</div>
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={signOut}
        className="w-full justify-start text-xs text-muted hover:text-danger"
      >
        <LogOut size={14} /> Cerrar sesión
      </Button>
    </div>
  );

  return (
    <>
      <header className="futuristic-panel fixed inset-x-0 top-0 z-30 border-b md:hidden">
        <div className="flex h-14 items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            aria-haspopup="dialog"
            className="flex size-9 items-center justify-center rounded-full border border-white/15 text-muted transition hover:bg-white/5 hover:text-white"
          >
            <Menu size={18} aria-hidden />
          </button>
          <Image
            src="/apple-touch-icon.png"
            alt="Allons icon"
            width={24}
            height={24}
            className="size-6 object-contain"
          />
          <span className="text-sm font-semibold uppercase tracking-[0.08em]">
            Allons Admin
          </span>
        </div>
      </header>

      <aside className="futuristic-panel relative z-10 hidden h-full shrink-0 flex-col overflow-hidden border-r md:flex md:w-72">
        {brand}
        {links()}
        {account}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            className="futuristic-panel relative z-10 flex h-full w-72 max-w-[80vw] flex-col overflow-hidden border-r"
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full border border-white/15 text-muted transition hover:bg-white/5 hover:text-white"
            >
              <X size={16} aria-hidden />
            </button>
            {brand}
            {links(() => setMobileOpen(false))}
            {account}
          </aside>
        </div>
      ) : null}
    </>
  );
}
