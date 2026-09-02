"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Camera, CheckCircle2 } from "lucide-react";
import type { AbrirTicketSuporteState } from "@/app/actions/suporte";

export function SuporteForm({
  action,
}: {
  action: (state: AbrirTicketSuporteState, formData: FormData) => Promise<AbrirTicketSuporteState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-success/30 bg-success-soft p-4 text-center">
        <CheckCircle2 className="text-success" size={24} />
        <p className="text-sm text-foreground/90">
          Recebemos seu ticket! Ele fica salvo aqui dentro do app — não vai pra WhatsApp nem e-mail.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <Field label="Categoria">
        <Select name="categoria" defaultValue="bug">
          <option value="bug">Erro/bug</option>
          <option value="sugestao">Sugestão de melhoria</option>
        </Select>
      </Field>
      <Field label="Descreva">
        <Textarea name="descricao" required placeholder="O que aconteceu, ou o que você gostaria de ver no app." />
      </Field>
      <Field label="Print (opcional)">
        <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted">
          <Camera size={18} />
          <span className="text-xs">Anexar print</span>
          <input type="file" name="print" accept="image/*" className="hidden" />
        </label>
      </Field>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enviando..." : "Enviar ticket de suporte"}
      </Button>
    </form>
  );
}
