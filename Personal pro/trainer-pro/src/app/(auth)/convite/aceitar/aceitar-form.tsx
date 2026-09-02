"use client";

import { useActionState } from "react";
import { aceitarConvite } from "@/app/actions/convite";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ShieldCheck } from "lucide-react";

export function AceitarConviteForm() {
  const [state, formAction, pending] = useActionState(aceitarConvite, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <Field label="Nova senha" hint="Mínimo de 8 caracteres, com pelo menos 1 letra maiúscula e 1 número.">
        <Input type="password" name="senha" minLength={8} required autoComplete="new-password" />
      </Field>
      <Field label="Confirmar senha">
        <Input
          type="password"
          name="confirmarSenha"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </Field>

      {/* Consentimento geral — termos de uso */}
      <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
        <input type="checkbox" name="aceitaTermos" className="mt-0.5 h-4 w-4 accent-primary" />
        <span>
          Li e concordo com os{" "}
          <a href="/termos" target="_blank" className="text-primary underline">
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a href="/privacidade" target="_blank" className="text-primary underline">
            Política de Privacidade
          </a>
          .
        </span>
      </label>

      {/* Consentimento específico — dados de saúde (LGPD art. 5º/11), separado do
          bloco acima, desmarcado por padrão. */}
      <div className="rounded-xl border-2 border-primary/30 bg-primary-soft p-3.5">
        <div className="mb-1.5 flex items-center gap-2 text-primary-dark">
          <ShieldCheck size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">
            Consentimento para dados de saúde
          </span>
        </div>
        <p className="mb-2.5 text-xs text-foreground/80">
          Para acompanhar seu treino, seu personal vai coletar dados sensíveis de saúde:
          medidas corporais e % de gordura, fotos de evolução, e relatos de dor/desconforto
          (incluindo fotos, se você anexar). Você pode revogar este consentimento a
          qualquer momento na tela &quot;Meus dados&quot;.
        </p>
        <label className="flex items-start gap-3 text-sm font-medium">
          <input
            type="checkbox"
            name="consenteDadosSaude"
            className="mt-0.5 h-4 w-4 accent-primary"
          />
          <span>Consinto com a coleta desses dados de saúde para acompanhar meu treino.</span>
        </label>
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Confirmando..." : "Aceitar convite"}
      </Button>
    </form>
  );
}
