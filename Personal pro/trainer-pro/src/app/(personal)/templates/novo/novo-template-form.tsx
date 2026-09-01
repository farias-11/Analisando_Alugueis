"use client";

import { useActionState } from "react";
import { criarTemplateVazio } from "@/app/actions/templates";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function NovoTemplateForm() {
  const [state, formAction, pending] = useActionState(criarTemplateVazio, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <Field label="Nome do template">
        <Input name="nome" required placeholder="Ex: ABC intermediário 8 exercícios" />
      </Field>
      <Field label="Descrição (opcional)">
        <Input name="descricao" placeholder="Ex: Foco em hipertrofia, 4x por semana" />
      </Field>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Criando..." : "Criar e editar"}
      </Button>
    </form>
  );
}
