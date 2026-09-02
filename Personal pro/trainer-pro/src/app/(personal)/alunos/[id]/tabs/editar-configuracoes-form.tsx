"use client";

import { useState } from "react";
import { atualizarConfiguracoesAluno } from "@/app/actions/alunos";
import { Button } from "@/components/ui/button";
import { Field, Select, Input, Toggle } from "@/components/ui/form";

export function EditarConfiguracoesForm({
  alunoId,
  anamneseAtivaInicial,
  bioimpedanciaAtivaInicial,
  bioimpedanciaFrequenciaInicial,
  duracaoCicloInicial,
}: {
  alunoId: string;
  anamneseAtivaInicial: boolean;
  bioimpedanciaAtivaInicial: boolean;
  bioimpedanciaFrequenciaInicial: number | null;
  duracaoCicloInicial: number;
}) {
  const [anamnese, setAnamnese] = useState(anamneseAtivaInicial);
  const [bioimpedancia, setBioimpedancia] = useState(bioimpedanciaAtivaInicial);

  return (
    <form action={atualizarConfiguracoesAluno} className="space-y-1">
      <input type="hidden" name="alunoId" value={alunoId} />
      <Toggle
        label="Anamnese"
        description="Formulário de saúde preenchido pelo aluno."
        checked={anamnese}
        onChange={setAnamnese}
        name="anamneseAtiva"
      />
      <div className="border-t border-border" />
      <Toggle
        label="Bioimpedância"
        description="Você registra periodicamente."
        checked={bioimpedancia}
        onChange={setBioimpedancia}
        name="bioimpedanciaAtiva"
      />
      {bioimpedancia && (
        <Field label="Frequência (dias)">
          <Input
            type="number"
            name="bioimpedanciaFrequencia"
            defaultValue={bioimpedanciaFrequenciaInicial ?? 30}
            min={1}
          />
        </Field>
      )}
      <div className="border-t border-border" />
      <Field label="Duração padrão do ciclo de treino">
        <Select name="duracaoCiclo" defaultValue={String(duracaoCicloInicial)}>
          <option value="2">2 semanas</option>
          <option value="4">4 semanas</option>
          <option value="6">6 semanas</option>
          <option value="8">8 semanas</option>
        </Select>
      </Field>
      <Button type="submit" size="sm" className="mt-2">
        Salvar configurações
      </Button>
    </form>
  );
}
