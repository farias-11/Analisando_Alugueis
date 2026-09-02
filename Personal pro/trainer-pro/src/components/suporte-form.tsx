"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { Camera, CheckCircle2, X } from "lucide-react";
import type { AbrirTicketSuporteState } from "@/app/actions/suporte";

export function SuporteForm({
  action,
}: {
  action: (state: AbrirTicketSuporteState, formData: FormData) => Promise<AbrirTicketSuporteState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [arquivos, setArquivos] = useState<File[]>([]);

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

  function removerArquivo(i: number) {
    setArquivos((atual) => atual.filter((_, idx) => idx !== i));
  }

  return (
    <form
      action={async (fd) => {
        fd.delete("prints");
        arquivos.forEach((f) => fd.append("prints", f));
        await formAction(fd);
      }}
      className="space-y-3"
    >
      <Field label="Categoria">
        <Select name="categoria" defaultValue="bug">
          <option value="bug">Erro/bug</option>
          <option value="sugestao">Sugestão de melhoria</option>
        </Select>
      </Field>
      <Field label="Descreva">
        <Textarea name="descricao" required placeholder="O que aconteceu, ou o que você gostaria de ver no app." />
      </Field>
      <Field label="Prints (opcional)" hint="Pode escolher mais de um.">
        <label className="flex h-20 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted">
          <Camera size={18} />
          <span className="text-xs">Anexar print(s)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => setArquivos((atual) => [...atual, ...Array.from(e.target.files ?? [])])}
          />
        </label>
        {arquivos.length > 0 && (
          <ul className="mt-2 space-y-1">
            {arquivos.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-neutral-soft px-2.5 py-1.5 text-xs">
                <span className="truncate">
                  {f.name} · {(f.size / 1024 / 1024).toFixed(1)}MB
                </span>
                <button type="button" onClick={() => removerArquivo(i)} className="shrink-0 text-muted-2 hover:text-danger">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>
      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enviando..." : "Enviar ticket de suporte"}
      </Button>
    </form>
  );
}
