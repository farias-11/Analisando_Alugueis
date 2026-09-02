"use client";

import { useState } from "react";
import { ExercicioAulaForm, type ExercicioBiblioteca } from "@/components/exercicio-aula-form";
import { adicionarExercicioAula } from "@/app/actions/treinos";
import { Plus } from "lucide-react";

export function AdicionarExercicioSection({
  alunoId,
  aulaId,
  biblioteca,
  nomesComTicketRecente,
}: {
  alunoId: string;
  aulaId: string;
  biblioteca: ExercicioBiblioteca[];
  nomesComTicketRecente: string[];
}) {
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary"
      >
        <Plus size={14} /> Adicionar exercício
      </button>
    );
  }

  return (
    <ExercicioAulaForm
      action={async (fd) => {
        await adicionarExercicioAula(fd);
        setAberto(false);
      }}
      hiddenFields={{ alunoId, aulaId }}
      biblioteca={biblioteca}
      nomesComTicketRecente={nomesComTicketRecente}
      textoSubmit="Adicionar"
      onCancelar={() => setAberto(false)}
      mostrarCombinarProximo={false}
    />
  );
}
