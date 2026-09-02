"use client";

import { useState } from "react";
import { ExercicioAulaForm, type ExercicioBiblioteca } from "@/components/exercicio-aula-form";
import {
  atualizarExercicioTemplateAula,
  moverExercicioTemplateAula,
  removerExercicioTemplateAula,
} from "@/app/actions/templates";
import { ChevronDown, ChevronUp, Flame, Link2, Pencil, Trash2 } from "lucide-react";
import type { TemplateAulaExercicio, Exercicio } from "@/lib/types";

/** Igual ExercicioAulaRow, mas pro editor de template — mesmas ações de
 * exibição/edição, só troca as chaves de identificação (templateId /
 * templateAulaId / templateAulaExercicioId em vez de aluno/aula). */
export function TemplateExercicioRow({
  ex,
  templateId,
  templateAulaId,
  biblioteca,
  ehPrimeiro,
  ehUltimo,
}: {
  ex: TemplateAulaExercicio & { exercicio: Exercicio };
  templateId: string;
  templateAulaId: string;
  biblioteca: ExercicioBiblioteca[];
  ehPrimeiro: boolean;
  ehUltimo: boolean;
}) {
  const [editando, setEditando] = useState(false);

  if (editando) {
    return (
      <ExercicioAulaForm
        action={async (fd) => {
          await atualizarExercicioTemplateAula(fd);
          setEditando(false);
        }}
        hiddenFields={{ templateId, templateAulaExercicioId: ex.id }}
        biblioteca={biblioteca}
        nomesComTicketRecente={[]}
        textoSubmit="Salvar alterações"
        onCancelar={() => setEditando(false)}
        mostrarCombinarProximo={!ehUltimo}
        valoresIniciais={{
          exercicioId: ex.exercicio_id,
          tipo: ex.tipo,
          series: ex.series,
          repeticoes: ex.repeticoes,
          cargaInicial: ex.carga_inicial,
          descansoSeg: ex.descanso_seg,
          duracaoMin: ex.duracao_min,
          intensidade: ex.intensidade,
          ehAquecimento: ex.eh_aquecimento,
          combinaProximo: ex.combina_proximo,
        }}
      />
    );
  }

  return (
    <div className="rounded-lg bg-neutral-soft px-3 py-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="flex flex-wrap items-center gap-1.5">
          {ex.exercicio?.nome}
          {ex.eh_aquecimento && (
            <span className="flex items-center gap-0.5 rounded-pill bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning">
              <Flame size={10} /> Aquecimento
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5 text-muted">
          <span className="mr-1 whitespace-nowrap">
            {ex.tipo === "cardio"
              ? `${ex.duracao_min ?? "—"}min${ex.intensidade ? ` · ${ex.intensidade}` : ""}`
              : `${ex.series}x${ex.repeticoes} · ${ex.carga_inicial ?? "—"}kg · ${ex.descanso_seg ?? "—"}s`}
          </span>
          <button type="button" onClick={() => setEditando(true)} className="text-muted-2 hover:text-foreground">
            <Pencil size={14} />
          </button>
          <form action={moverExercicioTemplateAula}>
            <input type="hidden" name="templateId" value={templateId} />
            <input type="hidden" name="templateAulaId" value={templateAulaId} />
            <input type="hidden" name="templateAulaExercicioId" value={ex.id} />
            <input type="hidden" name="direcao" value="up" />
            <button
              type="submit"
              disabled={ehPrimeiro}
              className="text-muted-2 hover:text-foreground disabled:opacity-30"
            >
              <ChevronUp size={14} />
            </button>
          </form>
          <form action={moverExercicioTemplateAula}>
            <input type="hidden" name="templateId" value={templateId} />
            <input type="hidden" name="templateAulaId" value={templateAulaId} />
            <input type="hidden" name="templateAulaExercicioId" value={ex.id} />
            <input type="hidden" name="direcao" value="down" />
            <button
              type="submit"
              disabled={ehUltimo}
              className="text-muted-2 hover:text-foreground disabled:opacity-30"
            >
              <ChevronDown size={14} />
            </button>
          </form>
          <form action={removerExercicioTemplateAula}>
            <input type="hidden" name="templateId" value={templateId} />
            <input type="hidden" name="templateAulaExercicioId" value={ex.id} />
            <button type="submit" className="text-muted-2 hover:text-danger">
              <Trash2 size={14} />
            </button>
          </form>
        </div>
      </div>
      {ex.combina_proximo && !ehUltimo && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-primary">
          <Link2 size={11} /> Bi-set com o próximo — faz os dois sem descanso entre eles
        </p>
      )}
    </div>
  );
}
