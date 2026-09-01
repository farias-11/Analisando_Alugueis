"use client";

import { useActionState, useState } from "react";
import { convidarAluno } from "@/app/actions/alunos";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Toggle } from "@/components/ui/form";
import { Card, CardTitle } from "@/components/ui/card";

export function ConvidarAlunoForm() {
  const [state, formAction, pending] = useActionState(convidarAluno, undefined);
  const [anamnese, setAnamnese] = useState(false);
  const [bioimpedancia, setBioimpedancia] = useState(false);

  return (
    <form action={formAction} className="space-y-4">
      <Card className="space-y-3">
        <Field label="Nome completo">
          <Input name="nome" required placeholder="Ex: Amanda Silva" />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" required placeholder="aluno@email.com" />
        </Field>
        <Field label="WhatsApp / Contato">
          <Input name="whatsapp" placeholder="(11) 99999-9999" />
        </Field>
        <Field label="Objetivo principal">
          <Input name="objetivo" placeholder="Ex: Emagrecer / Ganhar massa" />
        </Field>
      </Card>

      <Card className="space-y-1">
        <CardTitle className="mb-2">Avaliações e treino</CardTitle>
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
            <Input type="number" name="bioimpedanciaFrequencia" defaultValue={30} min={1} />
          </Field>
        )}
        <div className="border-t border-border" />
        <Field label="Duração padrão do primeiro ciclo de treino">
          <Select name="duracaoCiclo" defaultValue="4">
            <option value="2">2 semanas</option>
            <option value="4">4 semanas</option>
            <option value="6">6 semanas</option>
            <option value="8">8 semanas</option>
          </Select>
        </Field>
      </Card>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar convite"}
      </Button>
    </form>
  );
}
