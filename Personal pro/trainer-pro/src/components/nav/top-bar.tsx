import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

export function TopBar({
  title,
  back,
  action,
}: {
  title: string;
  back?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-surface/95 px-4 py-3.5 backdrop-blur">
      {back ? (
        <Link
          href={back}
          className="-ml-1.5 flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-neutral-soft"
        >
          <ChevronLeft size={20} />
        </Link>
      ) : null}
      <h1 className="flex-1 truncate text-base font-semibold">{title}</h1>
      {action}
    </header>
  );
}
