"use client";

import { useState } from "react";
import { ExercicioAulaForm, type ExercicioBiblioteca } from "@/components/exercicio-aula-form";
import { adicionarExercicioTemplateAula } from "@/app/actions/templates";
import { Plus } from "lucide-react";

export function AdicionarExercicioTemplateSection({
  templateId,
  templateAulaId,
  biblioteca,
}: {
  templateId: string;
  templateAulaId: string;
  biblioteca: ExercicioBiblioteca[];
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
        await adicionarExercicioTemplateAula(fd);
        setAberto(false);
      }}
      hiddenFields={{ templateId, templateAulaId }}
      biblioteca={biblioteca}
      nomesComTicketRecente={[]}
      textoSubmit="Adicionar"
      onCancelar={() => setAberto(false)}
      mostrarCombinarProximo={false}
    />
  );
}
