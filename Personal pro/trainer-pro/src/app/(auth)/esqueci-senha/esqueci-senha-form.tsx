"use client";

import { useActionState } from "react";
import { solicitarRecuperacaoSenha } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { CheckCircle2 } from "lucide-react";

export function EsqueciSenhaForm() {
  const [state, formAction, pending] = useActionState(solicitarRecuperacaoSenha, undefined);

  if (state?.enviado) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-success/30 bg-success-soft p-4 text-center">
        <CheckCircle2 className="text-success" size={28} />
        <p className="text-sm text-foreground/90">
          Se esse e-mail estiver cadastrado, você vai receber um link para redefinir sua senha.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Field label="E-mail">
        <Input type="email" name="email" placeholder="seu@email.com" required autoComplete="email" />
      </Field>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link de redefinição"}
      </Button>
    </form>
  );
}
