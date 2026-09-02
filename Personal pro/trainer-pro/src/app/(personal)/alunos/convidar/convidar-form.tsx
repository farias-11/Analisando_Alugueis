"use client";

import { useActionState, useState } from "react";
import { convidarAluno } from "@/app/actions/alunos";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Toggle } from "@/components/ui/form";
import { Card, CardTitle } from "@/components/ui/card";
import { buildWhatsappLink, mensagemConvite } from "@/lib/whatsapp";
import { formatMoedaBR } from "@/lib/status";
import { MessageCircle } from "lucide-react";
import type { Plano } from "@/lib/types";

export function ConvidarAlunoForm({ personalNome, planos }: { personalNome: string; planos: Plano[] }) {
  const [state, formAction, pending] = useActionState(convidarAluno, undefined);
  const [anamnese, setAnamnese] = useState(false);
  const [bioimpedancia, setBioimpedancia] = useState(false);

  if (state && "sucesso" in state) {
    const linkWhatsapp = state.whatsapp
      ? buildWhatsappLink(state.whatsapp, mensagemConvite({ alunoNome: state.alunoNome, personalNome, link: state.conviteLink }))
      : null;

    return (
      <Card className="space-y-3">
        <CardTitle>{state.alunoNome} foi cadastrado(a)!</CardTitle>
        <p className="text-sm text-muted">
          Agora é só enviar o convite. WhatsApp é o jeito mais rápido do aluno ver e entrar — o e-mail
          fica como alternativa, na ficha dele.
        </p>
        {linkWhatsapp ? (
          <a href={linkWhatsapp} target="_blank" rel="noreferrer">
            <Button type="button" className="w-full gap-1.5">
              <MessageCircle size={16} /> Enviar convite por WhatsApp
            </Button>
          </a>
        ) : (
          <p className="text-sm text-warning">
            Esse aluno não tem WhatsApp cadastrado — envie por e-mail na ficha dele.
          </p>
        )}
        <ButtonLink href={`/alunos/${state.alunoId}`} variant="outline" className="w-full">
          Ver ficha do aluno
        </ButtonLink>
      </Card>
    );
  }

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
        <Field label="Plano" hint="Define o valor e a recorrência da cobrança. Dá pra trocar depois na ficha do aluno.">
          <Select name="planoId" defaultValue="">
            <option value="">Sem plano por enquanto</option>
            {planos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {formatMoedaBR(p.valor)}
              </option>
            ))}
          </Select>
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

      {state && "error" in state ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar convite"}
      </Button>
    </form>
  );
}
