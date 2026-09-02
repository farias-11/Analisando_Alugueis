"use client";

import { useState, useTransition } from "react";
import { renovarCicloComProgressao } from "@/app/actions/treinos";
import { Button } from "@/components/ui/button";
import type { SugestaoRenovacao } from "@/lib/data/aluno";
import { TrendingUp, X } from "lucide-react";

/** Renovação com progressão sugerida (handoff 3.2): mostra a carga sugerida
 * (+5% pra quem subiu, mantém quem estagnou) por exercício, editável antes
 * de aplicar — o personal decide linha a linha, não é automático. */
export function RenovarCicloModal({
  alunoId,
  cicloId,
  sugestoes,
}: {
  alunoId: string;
  cicloId: string;
  sugestoes: SugestaoRenovacao[];
}) {
  const [aberto, setAberto] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(sugestoes.map((s) => [s.aulaExercicioId, s.cargaSugerida !== null ? String(s.cargaSugerida) : ""]))
  );
  const [pending, startTransition] = useTransition();

  function aplicar() {
    const fd = new FormData();
    fd.set("alunoId", alunoId);
    fd.set("cicloId", cicloId);
    const ajustes: Record<string, number> = {};
    for (const s of sugestoes) {
      const bruto = valores[s.aulaExercicioId];
      if (bruto !== undefined && bruto !== "") ajustes[s.aulaExercicioId] = Number(bruto);
    }
    fd.set("ajustes", JSON.stringify(ajustes));
    startTransition(async () => {
      await renovarCicloComProgressao(fd);
      setAberto(false);
    });
  }

  return (
    <>
      <Button type="button" size="sm" onClick={() => setAberto(true)}>
        Renovar ciclo
      </Button>

      {aberto && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold">Renovar com progressão sugerida</h2>
              <button onClick={() => setAberto(false)} className="text-muted-2 hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted">
              Sugerimos +5% de carga nos exercícios em que a última execução veio acima da carga inicial.
              Ajuste ou apague antes de aplicar — o que ficar em branco mantém a carga atual.
            </p>

            {sugestoes.length === 0 ? (
              <p className="mb-3 text-sm text-muted">
                Nenhum exercício de força com carga registrada neste ciclo pra sugerir progressão. A
                renovação vai copiar as cargas como estão.
              </p>
            ) : (
              <div className="mb-4 space-y-2">
                {sugestoes.map((s) => (
                  <div key={s.aulaExercicioId} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-soft px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.exercicioNome}</p>
                      <p className="truncate text-xs text-muted">
                        {s.aulaNome} · atual {s.cargaAtual ?? "—"}kg
                        {s.subiu && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-success">
                            <TrendingUp size={11} /> subiu
                          </span>
                        )}
                      </p>
                    </div>
                    <input
                      type="number"
                      step="0.5"
                      value={valores[s.aulaExercicioId]}
                      onChange={(e) => setValores((v) => ({ ...v, [s.aulaExercicioId]: e.target.value }))}
                      className="h-9 w-20 shrink-0 rounded-lg border border-border px-2 text-right text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAberto(false)}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1" disabled={pending} onClick={aplicar}>
                {pending ? "Aplicando..." : "Aplicar e renovar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
