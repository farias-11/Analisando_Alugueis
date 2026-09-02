"use client";

import { useActionState } from "react";
import { redefinirSenha } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function RedefinirSenhaForm() {
  const [state, formAction, pending] = useActionState(redefinirSenha, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Nova senha" hint="Mínimo de 8 caracteres, com pelo menos 1 letra maiúscula e 1 número.">
        <Input type="password" name="senha" minLength={8} required autoComplete="new-password" />
      </Field>
      <Field label="Confirmar nova senha">
        <Input type="password" name="confirmarSenha" minLength={8} required autoComplete="new-password" />
      </Field>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Redefinir senha"}
      </Button>
    </form>
  );
}
