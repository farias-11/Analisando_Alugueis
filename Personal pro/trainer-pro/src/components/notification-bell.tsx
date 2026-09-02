import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBell({ count, href = "/notificacoes" }: { count: number; href?: string }) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface text-foreground shadow-sm ring-1 ring-border"
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-pill bg-danger px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
