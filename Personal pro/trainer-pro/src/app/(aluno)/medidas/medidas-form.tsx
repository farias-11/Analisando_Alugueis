"use client";

import { useActionState, useState } from "react";
import { salvarMedidas } from "@/app/actions/medidas";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Camera, Check } from "lucide-react";

// tem que ficar abaixo do bodySizeLimit do Server Action (next.config.ts) —
// deixa folga pro overhead do multipart/form-data.
const TAMANHO_MAXIMO_BYTES = 14 * 1024 * 1024;

const LABEL_CIRCUNFERENCIA: Record<string, string> = {
  peito: "Peito",
  cintura: "Cintura",
  quadril: "Quadril",
  braco: "Braço",
  coxa_direita: "Coxa direita",
  coxa_esquerda: "Coxa esquerda",
};
const CIRCUNFERENCIAS = Object.keys(LABEL_CIRCUNFERENCIA);

/** Peso é sempre pedido; o resto (% gordura, circunferências) só aparece se
 * o personal marcou como solicitado pra esse aluno — tem quem só quer se
 * pesar, não faz sentido empurrar 6 campos de fita métrica pra essa pessoa. */
export function MedidasForm({ medidasSolicitadas }: { medidasSolicitadas: string[] }) {
  const [state, formAction, pending] = useActionState(salvarMedidas, undefined);
  const [nomeFoto, setNomeFoto] = useState<string | null>(null);
  const [erroTamanho, setErroTamanho] = useState<string | null>(null);
  const pedeGordura = medidasSolicitadas.includes("percentual_gordura");
  const circunferenciasPedidas = CIRCUNFERENCIAS.filter((c) => medidasSolicitadas.includes(c));

  return (
    <form action={formAction} className="space-y-3">
      <Field label="Data">
        <Input type="date" name="data" defaultValue={new Date().toISOString().slice(0, 10)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Peso (kg)">
          <Input type="text" inputMode="decimal" name="peso" placeholder="0,0" />
        </Field>
        {pedeGordura && (
          <Field label="% de gordura">
            <Input type="text" inputMode="decimal" name="percentual_gordura" placeholder="0,0" />
          </Field>
        )}
      </div>
      {circunferenciasPedidas.length > 0 && (
        <>
          <p className="pt-1 text-xs font-medium uppercase tracking-wide text-muted">
            Circunferências (cm)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {circunferenciasPedidas.map((campo) => (
              <Field key={campo} label={LABEL_CIRCUNFERENCIA[campo]}>
                <Input type="text" inputMode="decimal" name={campo} placeholder="0,0" />
              </Field>
            ))}
          </div>
        </>
      )}

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
