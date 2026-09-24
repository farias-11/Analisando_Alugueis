"use client";

import { useActionState } from "react";
import { criarTicket } from "@/app/actions/tickets";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { Camera, CheckCircle2 } from "lucide-react";

export function RelatarDorForm({
  aulaExercicioId,
  exercicioNome,
  aulaNome,
}: {
  aulaExercicioId: string;
  exercicioNome: string;
  aulaNome: string;
}) {
  const [state, formAction, pending] = useActionState(criarTicket, undefined);

  // Fica dentro do app: nada de WhatsApp nem de tirar o aluno do treino no
  // meio — o relato já cai na fila de atividades do personal (dentro do
  // app, ver criarTicket) e ele recebe aviso por lá.
  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-success-soft p-6 text-center">
        <CheckCircle2 size={32} className="text-success" />
        <div>
          <p className="font-semibold text-success">Relato enviado!</p>
          <p className="mt-1 text-sm text-muted">Seu personal foi avisado e vai te responder por aqui.</p>
        </div>
        <ButtonLink href="/treino" className="w-full">
          Voltar ao treino
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="aulaExercicioId" value={aulaExercicioId} />
      <input type="hidden" name="exercicioNome" value={exercicioNome} />
      <input type="hidden" name="aulaNome" value={aulaNome} />

      <div className="rounded-xl bg-neutral-soft px-3.5 py-3 text-sm">
        <p className="font-medium">{exercicioNome}</p>
        <p className="text-xs text-muted">{aulaNome}</p>
      </div>

      <Field label="O que você sentiu?">
        <Textarea
          name="descricao"
          required
          placeholder="Descreva onde e como você está sentindo desconforto ou dor."
        />
      </Field>

      <Field label="Foto (opcional)">
        <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted">
          <Camera size={20} />
          <span className="text-xs">Anexar foto</span>
          <input type="file" name="foto" accept="image/*" className="hidden" />
        </label>
      </Field>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar para o personal"}
      </Button>
    </form>
  );
}
