"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ArrowUpDown, Search } from "lucide-react";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

// Atalhos prontos pro caso de uso mais comum (handoff, seção 4) — cada um é
// só um jeito mais rápido de chegar numa combinação de filtro que já existia.
const CHIPS_RAPIDOS = [
  { label: "Vence esta semana", param: "treino", valor: "vencendo" },
  { label: "Atrasado", param: "pagamento", valor: "atrasado" },
  { label: "Sem check-in há 30 dias", param: "semCheckin", valor: "30" },
] as const;

export function FiltrosAlunos() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  const ordenandoPorUrgencia = searchParams.get("ordenar") === "urgencia";

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-2" />
        <input
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => setParam("q", e.target.value)}
          placeholder="Buscar aluno..."
          className="h-11 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {CHIPS_RAPIDOS.map((chip) => {
          const ativo = searchParams.get(chip.param) === chip.valor;
          return (
            <button
              key={chip.label}
              onClick={() => setParam(chip.param, ativo ? "" : chip.valor)}
              className={cn(
                "shrink-0 rounded-pill border px-3 py-1.5 text-xs font-medium",
                ativo ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"
              )}
            >
              {chip.label}
            </button>
          );
        })}
        <button
          onClick={() => setParam("ordenar", ordenandoPorUrgencia ? "" : "urgencia")}
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-pill border px-3 py-1.5 text-xs font-medium",
            ordenandoPorUrgencia ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"
          )}
        >
          <ArrowUpDown size={12} /> Mais urgente primeiro
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <select
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
          className="h-9 rounded-pill border border-border bg-surface px-3 text-xs"
        >
          <option value="">Status: todos</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </select>
        <select
          defaultValue={searchParams.get("pagamento") ?? ""}
          onChange={(e) => setParam("pagamento", e.target.value)}
          className="h-9 rounded-pill border border-border bg-surface px-3 text-xs"
        >
          <option value="">Pagamento: todos</option>
          <option value="em_dia">Em dia</option>
          <option value="atrasado">Atrasado</option>
        </select>
        <select
          defaultValue={searchParams.get("treino") ?? ""}
          onChange={(e) => setParam("treino", e.target.value)}
          className="h-9 rounded-pill border border-border bg-surface px-3 text-xs"
        >
          <option value="">Treino: todos</option>
          <option value="ativo">Ativo</option>
          <option value="vencendo">Vencendo</option>
          <option value="vencido">Vencido</option>
        </select>
      </div>
    </div>
  );
}
