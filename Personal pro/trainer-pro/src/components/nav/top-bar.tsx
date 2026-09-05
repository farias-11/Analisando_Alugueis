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
    <header
      // h-[53px] fixo (em vez de altura ditada por py-3.5 + o maior filho) —
      // sem isso, uma action mais alta que o título (ex: TreinoTimer) deixava
      // ESSA página com cabeçalho mais alto que as outras, e o sino de
      // notificação (que o layout sobrepõe com um deslocamento fixo do topo,
      // ver (aluno)/layout.tsx) parava de ficar centralizado só nelas.
      className={`sticky top-0 z-30 flex h-[53px] items-center gap-2 border-b border-border bg-surface/95 backdrop-blur pl-4 ${action ? "pr-14" : "pr-4"}`}
    >
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
