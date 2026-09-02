"use client";

import { useActionState, useState } from "react";
import { salvarMedidas } from "@/app/actions/medidas";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Camera, Check } from "lucide-react";

// tem que ficar abaixo do bodySizeLimit do Server Action (next.config.ts) —
// deixa folga pro overhead do multipart/form-data.
const TAMANHO_MAXIMO_BYTES = 14 * 1024 * 1024;

export function MedidasForm() {
  const [state, formAction, pending] = useActionState(salvarMedidas, undefined);
  const [nomeFoto, setNomeFoto] = useState<string | null>(null);
  const [erroTamanho, setErroTamanho] = useState<string | null>(null);

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

      <Field
        label="Foto de progresso (opcional)"
        hint="Dica: tire de frente, com a mesma roupa, no mesmo horário e com a mesma luz sempre — isso deixa a comparação ao longo do tempo muito mais confiável."
      >
        <label className="flex h-24 w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted">
          {nomeFoto ? <Check size={20} className="text-success" /> : <Camera size={20} />}
          <span className="max-w-[90%] truncate text-xs">{nomeFoto ?? "Adicionar foto"}</span>
          <input
            type="file"
            name="foto"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo && arquivo.size > TAMANHO_MAXIMO_BYTES) {
                setErroTamanho("Essa foto é muito grande (máx. 14MB). Tente tirar com menos qualidade ou escolher outra.");
                setNomeFoto(null);
                e.target.value = "";
                return;
              }
              setErroTamanho(null);
              setNomeFoto(arquivo?.name ?? null);
            }}
          />
        </label>
        {erroTamanho && <p className="mt-1 text-xs text-danger">{erroTamanho}</p>}
      </Field>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state?.ok ? <p className="text-sm text-success">Medidas salvas!</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Salvar medidas"}
      </Button>
    </form>
  );
}
