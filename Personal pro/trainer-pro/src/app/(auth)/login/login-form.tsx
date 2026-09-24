"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

export function LoginForm({ erroInicial }: { erroInicial?: string }) {
  const [state, formAction, pending] = useActionState(login, undefined);
  const erro = state?.error ?? erroInicial;

  return (
    <form action={formAction} className="space-y-4">
      <Field label="E-mail">
        <Input type="email" name="email" placeholder="seu@email.com" required autoComplete="email" />
      </Field>
      <Field label="Senha">
        <Input type="password" name="senha" placeholder="••••••••" required autoComplete="current-password" />
      </Field>
      <Link href="/esqueci-senha" className="-mt-2 block text-right text-xs text-primary">
        Esqueci minha senha
      </Link>
      {erro ? <p className="text-sm text-danger">{erro}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
