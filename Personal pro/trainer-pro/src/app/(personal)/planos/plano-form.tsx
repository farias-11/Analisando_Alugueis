"use client";

import { useActionState } from "react";
import { criarPlano, atualizarPlano, type PlanoState } from "@/app/actions/planos";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import type { Plano } from "@/lib/types";

const RECORRENCIAS = [1, 2, 3, 4, 5, 6, 12];

function PlanoFormBase({
  action,
  plano,
  onSalvo,
}: {
  action: (state: PlanoState, formData: FormData) => Promise<PlanoState>;
  plano?: Plano;
  onSalvo?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onSalvo?.();
      }}
      className="space-y-3"
    >
      {plano && <input type="hidden" name="planoId" value={plano.id} />}
      <Field label="Nome do plano">
        <Input name="nome" required placeholder="Ex: Mensal, Trimestral..." defaultValue={plano?.nome} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor (R$)">
          <Input name="valor" type="number" step="0.01" min={0} defaultValue={plano?.valor ?? 0} required />
        </Field>
        <Field label="Recorrência">
          <Select name="recorrenciaMeses" defaultValue={String(plano?.recorrencia_meses ?? 1)}>
            {RECORRENCIAS.map((m) => (
              <option key={m} value={m}>
                {m === 1 ? "Mensal (1 mês)" : `A cada ${m} meses`}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Dia de pagamento (opcional)" hint="Dia do mês em que costuma vencer, ex: 5">
        <Input name="diaPagamento" type="number" min={1} max={31} defaultValue={plano?.dia_pagamento ?? ""} />
      </Field>

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Salvando..." : "Salvar plano"}
      </Button>
    </form>
  );
}

export function NovoPlanoForm({ onSalvo }: { onSalvo?: () => void }) {
  return <PlanoFormBase action={criarPlano} onSalvo={onSalvo} />;
}

export function EditarPlanoForm({ plano, onSalvo }: { plano: Plano; onSalvo?: () => void }) {
  return <PlanoFormBase action={atualizarPlano} plano={plano} onSalvo={onSalvo} />;
}
