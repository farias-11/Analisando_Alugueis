"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "./bottom-nav";
import { ICON_MAP } from "./icon-map";
import { Dumbbell, LogOut } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { NotificationBell } from "@/components/notification-bell";

export function Sidebar({
  items,
  nome,
  notificacoes = 0,
}: {
  items: NavItem[];
  nome: string;
  notificacoes?: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-surface md:py-6">
      <div className="flex items-center justify-between gap-2 px-6 pb-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <Dumbbell size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Trainer Pro</p>
            <p className="text-xs text-muted leading-tight">{nome}</p>
          </div>
        </div>
        <NotificationBell count={notificacoes} />
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = ICON_MAP[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                active ? "bg-primary-soft text-primary-dark" : "text-muted hover:bg-neutral-soft"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={logout} className="px-3 pt-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-neutral-soft"
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </form>
    </aside>
  );
}
