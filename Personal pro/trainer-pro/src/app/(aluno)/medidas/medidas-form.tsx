"use client";

import { useActionState } from "react";
import { salvarMedidas } from "@/app/actions/medidas";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Camera } from "lucide-react";

export function MedidasForm() {
  const [state, formAction, pending] = useActionState(salvarMedidas, undefined);

  return (
    <form action={formAction} className="space-y-3">
      <Field label="Data">
        <Input type="date" name="data" defaultValue={new Date().toISOString().slice(0, 10)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Peso (kg)">
          <Input type="number" step="0.1" name="peso" />
        </Field>
        <Field label="% de gordura">
          <Input type="number" step="0.1" name="percentual_gordura" />
        </Field>
      </div>
      <p className="pt-1 text-xs font-medium uppercase tracking-wide text-muted">
        Circunferências (cm)
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Peito"><Input type="number" step="0.1" name="peito" /></Field>
        <Field label="Cintura"><Input type="number" step="0.1" name="cintura" /></Field>
        <Field label="Quadril"><Input type="number" step="0.1" name="quadril" /></Field>
        <Field label="Braço"><Input type="number" step="0.1" name="braco" /></Field>
        <Field label="Coxa direita"><Input type="number" step="0.1" name="coxa_direita" /></Field>
        <Field label="Coxa esquerda"><Input type="number" step="0.1" name="coxa_esquerda" /></Field>
      </div>

      <Field label="Foto de progresso (opcional)">
        <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted">
          <Camera size={20} />
          <span className="text-xs">Adicionar foto</span>
          <input type="file" name="foto" accept="image/*" className="hidden" />
        </label>
      </Field>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-success">Medidas salvas!</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Salvar medidas"}
      </Button>
    </form>
  );
}
