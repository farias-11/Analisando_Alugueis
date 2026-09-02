"use client";

import { useActionState } from "react";
import { trocarSenha } from "@/app/actions/conta";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function TrocarSenhaForm() {
  const [state, formAction, pending] = useActionState(trocarSenha, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <Field label="Nova senha" hint="Mínimo de 8 caracteres, com pelo menos 1 letra maiúscula e 1 número.">
        <Input type="password" name="novaSenha" minLength={8} required autoComplete="new-password" />
      </Field>
      <Field label="Confirmar nova senha">
        <Input type="password" name="confirmarSenha" minLength={8} required autoComplete="new-password" />
      </Field>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-success">Senha atualizada!</p> : null}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Salvando..." : "Trocar senha"}
      </Button>
    </form>
  );
}
