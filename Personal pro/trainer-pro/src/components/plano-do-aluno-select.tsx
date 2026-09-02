"use client";

import { useTransition } from "react";
import { definirPlanoDoAluno } from "@/app/actions/planos";
import { formatMoedaBR } from "@/lib/status";
import type { Plano } from "@/lib/types";

export function PlanoDoAlunoSelect({
  alunoId,
  planoIdAtual,
  planos,
}: {
  alunoId: string;
  planoIdAtual: string | null;
  planos: Plano[];
}) {
  const [pending, startTransition] = useTransition();

  function alterar(planoId: string) {
    const fd = new FormData();
    fd.set("alunoId", alunoId);
    fd.set("planoId", planoId);
    startTransition(async () => {
      await definirPlanoDoAluno(fd);
    });
  }

  return (
    <select
      defaultValue={planoIdAtual ?? ""}
      onChange={(e) => alterar(e.target.value)}
      disabled={pending}
      className="h-9 rounded-lg border border-border px-2 text-xs"
    >
      <option value="">Sem plano</option>
      {planos.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nome} — {formatMoedaBR(p.valor)}
        </option>
      ))}
    </select>
  );
}
