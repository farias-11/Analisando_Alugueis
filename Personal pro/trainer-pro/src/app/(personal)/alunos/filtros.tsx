"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useTransition } from "react";

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
