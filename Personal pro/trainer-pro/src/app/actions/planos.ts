"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePersonal } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

const RECORRENCIAS_VALIDAS = [1, 2, 3, 4, 5, 6, 12];

export type PlanoState = { error?: string } | undefined;

export async function criarPlano(_prevState: PlanoState, formData: FormData): Promise<PlanoState> {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const valor = Number(formData.get("valor") || 0);
  const recorrenciaMeses = Number(formData.get("recorrenciaMeses") || 1);
  const diaPagamentoRaw = String(formData.get("diaPagamento") || "").trim();
  const diaPagamento = diaPagamentoRaw ? Number(diaPagamentoRaw) : null;

  if (!nome) return { error: "Dê um nome pro plano." };
  if (!RECORRENCIAS_VALIDAS.includes(recorrenciaMeses)) return { error: "Recorrência inválida." };
  if (diaPagamento !== null && (diaPagamento < 1 || diaPagamento > 31)) {
    return { error: "Dia de pagamento precisa ser entre 1 e 31." };
  }

  await supabase.from("planos").insert({
    personal_id: personal.id,
    nome,
    valor,
    recorrencia_meses: recorrenciaMeses,
    dia_pagamento: diaPagamento,
  });

  revalidatePath("/planos");
  return undefined;
}

export async function atualizarPlano(_prevState: PlanoState, formData: FormData): Promise<PlanoState> {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const planoId = String(formData.get("planoId") || "");
  const nome = String(formData.get("nome") || "").trim();
  const valor = Number(formData.get("valor") || 0);
  const recorrenciaMeses = Number(formData.get("recorrenciaMeses") || 1);
  const diaPagamentoRaw = String(formData.get("diaPagamento") || "").trim();
  const diaPagamento = diaPagamentoRaw ? Number(diaPagamentoRaw) : null;

  if (!nome) return { error: "Dê um nome pro plano." };
  if (!RECORRENCIAS_VALIDAS.includes(recorrenciaMeses)) return { error: "Recorrência inválida." };
  if (diaPagamento !== null && (diaPagamento < 1 || diaPagamento > 31)) {
    return { error: "Dia de pagamento precisa ser entre 1 e 31." };
  }

  await supabase
    .from("planos")
    .update({ nome, valor, recorrencia_meses: recorrenciaMeses, dia_pagamento: diaPagamento })
    .eq("id", planoId)
    .eq("personal_id", personal.id);

  revalidatePath("/planos");
  return undefined;
}

export async function excluirPlano(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const planoId = String(formData.get("planoId") || "");

  // alunos nesse plano não ficam sem cobrança — só perdem o vínculo (plano_id
  // vira null via "on delete set null"), o valor/vencimento já lançado continua
  await supabase.from("planos").delete().eq("id", planoId).eq("personal_id", personal.id);

  revalidatePath("/planos");
}

export async function definirPlanoDoAluno(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const alunoId = String(formData.get("alunoId") || "");
  const planoIdRaw = String(formData.get("planoId") || "");
  const planoId = planoIdRaw || null;

  const { data: aluno } = await supabase
    .from("alunos")
    .select("id")
    .eq("id", alunoId)
    .eq("personal_id", personal.id)
    .maybeSingle();
  if (!aluno) return;

  const update: { plano_id: string | null; pagamento_valor?: number } = { plano_id: planoId };
  if (planoId) {
    const { data: plano } = await supabase.from("planos").select("valor").eq("id", planoId).maybeSingle();
    if (plano) update.pagamento_valor = plano.valor;
  }

  await supabase.from("alunos").update(update).eq("id", alunoId);
  revalidatePath(`/alunos/${alunoId}`);
}
