import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "geral", label: "Geral" },
  { key: "medidas", label: "Medidas" },
  { key: "avaliacoes", label: "Avaliações" },
  { key: "treino", label: "Treino" },
  { key: "historico", label: "Histórico" },
  { key: "tickets", label: "Tickets" },
] as const;

export function TabNav({ alunoId, aba }: { alunoId: string; aba: string }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border px-4 md:px-0">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/alunos/${alunoId}?aba=${t.key}`}
          className={cn(
            "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium",
            aba === t.key ? "border-primary text-primary" : "border-transparent text-muted"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
