"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { criarTicket } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form";
import { AlertTriangle, Camera } from "lucide-react";

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
  const router = useRouter();
  const enviouRef = useRef(false);

  useEffect(() => {
    if (state?.whatsappUrl && !enviouRef.current) {
      enviouRef.current = true;
      window.location.href = state.whatsappUrl;
      setTimeout(() => router.push("/treino"), 300);
    }
  }, [state?.whatsappUrl, router]);

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

      <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-xs text-warning">
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
        <p>
          Ao enviar, abriremos o WhatsApp com essa mensagem (e a foto, se anexada) para você
          mandar ao seu personal — a partir daí, esse conteúdo passa a trafegar fora do app.
        </p>
      </div>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar para o personal"}
      </Button>
    </form>
  );
}
