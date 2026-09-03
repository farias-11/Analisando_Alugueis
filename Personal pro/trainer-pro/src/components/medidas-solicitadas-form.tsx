"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CAMPOS_MEDIDA_DISPONIVEIS } from "@/lib/constantes";
import { atualizarMedidasSolicitadas } from "@/app/actions/alunos";

/** Peso é sempre pedido pro aluno (não é opcional) — aqui só controla o
 * resto: % de gordura e circunferências, que tem aluno que nunca vai medir. */
export function MedidasSolicitadasForm({ alunoId, atuais }: { alunoId: string; atuais: string[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set(atuais));
  const [pending, startTransition] = useTransition();

  function salvar(novos: Set<string>) {
    const fd = new FormData();
    fd.set("alunoId", alunoId);
    novos.forEach((campo) => fd.append("campos", campo));
    startTransition(async () => {
      await atualizarMedidasSolicitadas(fd);
    });
  }

  function alternar(campo: string) {
    const novo = new Set(selecionados);
    if (novo.has(campo)) novo.delete(campo);
    else novo.add(campo);
    setSelecionados(novo);
    salvar(novo);
  }

  function selecionarTodas() {
    const todas = new Set(CAMPOS_MEDIDA_DISPONIVEIS.map((c) => c.campo));
    setSelecionados(todas);
    salvar(todas);
  }

  function soPeso() {
    setSelecionados(new Set());
    salvar(new Set());
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between py-1 text-sm text-muted">
        <span>Peso</span>
        <span className="text-xs">sempre pedido</span>
      </div>
      {CAMPOS_MEDIDA_DISPONIVEIS.map(({ campo, label }) => (
        <label key={campo} className="flex items-center justify-between gap-4 py-1.5 text-sm">
          <span>{label}</span>
          <input
            type="checkbox"
            checked={selecionados.has(campo)}
            onChange={() => alternar(campo)}
            disabled={pending}
            className="h-5 w-5 accent-primary"
          />
        </label>
      ))}
      <div className="flex gap-2 pt-2">
        <Button type="button" size="sm" variant="outline" onClick={selecionarTodas} disabled={pending}>
          Selecionar todas
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={soPeso} disabled={pending}>
          Só peso
        </Button>
      </div>
    </div>
  );
}
