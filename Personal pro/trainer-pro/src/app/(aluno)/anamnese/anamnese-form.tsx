"use client";

import { useActionState } from "react";
import { enviarAnamnese } from "@/app/actions/anamnese";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Card, CardTitle } from "@/components/ui/card";
import type { Anamnese } from "@/lib/types";

export function AnamneseForm({ anamnese }: { anamnese: Anamnese | null }) {
  const [state, formAction, pending] = useActionState(enviarAnamnese, undefined);
  const r = (anamnese?.respostas ?? {}) as Record<string, string>;

  return (
    <form action={formAction} className="space-y-4">
      <Card>
        <CardTitle className="mb-3">1. Dados gerais</CardTitle>
        <div className="space-y-3">
          <Field label="Idade">
            <Input name="idade" type="number" min={0} defaultValue={r.idade} required />
          </Field>
          <Field label="Profissão">
            <Input name="profissao" defaultValue={r.profissao} />
          </Field>
          <Field label="Nível de atividade física atual">
            <Select name="nivel_atividade" defaultValue={r.nivel_atividade} required>
              <option value="">Selecione</option>
              <option value="sedentario">Sedentário</option>
              <option value="leve">Leve</option>
              <option value="moderado">Moderado</option>
              <option value="intenso">Intenso</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">2. Histórico de saúde</CardTitle>
        <div className="space-y-3">
          <Field label="Doenças diagnosticadas" hint="Hipertensão, diabetes, problemas cardíacos etc.">
            <Textarea name="doencas" defaultValue={r.doencas} />
          </Field>
          <Field label="Medicamentos de uso contínuo">
            <Textarea name="medicamentos" defaultValue={r.medicamentos} />
          </Field>
          <Field label="Cirurgias anteriores">
            <Textarea name="cirurgias" defaultValue={r.cirurgias} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">3. Lesões e dores</CardTitle>
        <div className="space-y-3">
          <Field label="Lesão ou dor atual/recorrente" hint="Onde dói ou já doeu.">
            <Textarea name="lesoes_dores" defaultValue={r.lesoes_dores} />
          </Field>
          <Field label="Histórico de fisioterapia">
            <Textarea name="fisioterapia" defaultValue={r.fisioterapia} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">4. Hábitos</CardTitle>
        <div className="space-y-3">
          <Field label="Fumante?">
            <Select name="fumante" defaultValue={r.fumante}>
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
              <option value="ex_fumante">Ex-fumante</option>
            </Select>
          </Field>
          <Field label="Consumo de álcool">
            <Select name="alcool" defaultValue={r.alcool}>
              <option value="nao">Não bebe</option>
              <option value="social">Socialmente</option>
              <option value="frequente">Frequentemente</option>
            </Select>
          </Field>
          <Field label="Qualidade do sono">
            <Select name="sono" defaultValue={r.sono}>
              <option value="boa">Boa</option>
              <option value="regular">Regular</option>
              <option value="ruim">Ruim</option>
            </Select>
          </Field>
          <Field label="Nível de estresse">
            <Select name="estresse" defaultValue={r.estresse}>
              <option value="baixo">Baixo</option>
              <option value="medio">Médio</option>
              <option value="alto">Alto</option>
            </Select>
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">5. Objetivos</CardTitle>
        <div className="space-y-3">
          <Field label="Objetivo principal">
            <Select name="objetivo_principal" defaultValue={r.objetivo_principal} required>
              <option value="">Selecione</option>
              <option value="emagrecimento">Emagrecimento</option>
              <option value="hipertrofia">Hipertrofia</option>
              <option value="condicionamento">Condicionamento</option>
              <option value="saude_geral">Saúde geral</option>
            </Select>
          </Field>
          <Field label="Experiência prévia com treino">
            <Textarea name="experiencia_previa" defaultValue={r.experiencia_previa} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">6. Observações</CardTitle>
        <Textarea name="observacoes" placeholder="Observações livres" defaultValue={r.observacoes} />
      </Card>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar"}
      </Button>
    </form>
  );
}
