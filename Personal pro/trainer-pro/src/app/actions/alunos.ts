"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePersonal } from "@/lib/data/current-user";
import { notificarAluno } from "@/lib/notificar";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ConvidarAlunoState = { error?: string } | undefined;

export async function convidarAluno(
  _prevState: ConvidarAlunoState,
  formData: FormData
): Promise<ConvidarAlunoState> {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const whatsapp = String(formData.get("whatsapp") || "").trim();
  const objetivo = String(formData.get("objetivo") || "").trim();
  const anamneseAtiva = formData.get("anamneseAtiva") === "on";
  const bioimpedanciaAtiva = formData.get("bioimpedanciaAtiva") === "on";
  const bioimpedanciaFrequencia = formData.get("bioimpedanciaFrequencia");
  const duracaoCiclo = Number(formData.get("duracaoCiclo") || 4);

  if (!nome || !email) {
    return { error: "Nome e e-mail são obrigatórios." };
  }

  const { data: aluno, error } = await supabase
    .from("alunos")
    .insert({
      personal_id: personal.id,
      nome,
      email,
      whatsapp: whatsapp || null,
      objetivo: objetivo || null,
      anamnese_ativa: anamneseAtiva,
      bioimpedancia_ativa: bioimpedanciaAtiva,
      bioimpedancia_frequencia_dias: bioimpedanciaAtiva ? Number(bioimpedanciaFrequencia) || 30 : null,
      ciclo_duracao_padrao_semanas: duracaoCiclo,
    })
    .select()
    .single();

  if (error || !aluno) {
    if (error?.code === "23505") {
      return { error: "Já existe um aluno com esse e-mail." };
    }
    return { error: "Não foi possível criar o convite. Tente novamente." };
  }

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/convite/aceitar`,
  });

  if (inviteError) {
    // aluno já foi criado no banco — o personal pode reenviar o convite depois
    return {
      error:
        "Aluno criado, mas não foi possível enviar o e-mail de convite agora. Tente reenviar na ficha do aluno.",
    };
  }

  revalidatePath("/alunos");
  redirect(`/alunos/${aluno.id}`);
}

export async function marcarComoPago(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const alunoId = String(formData.get("alunoId") || "");
  const valor = Number(formData.get("valor") || 0);
  const dataPagamento = String(formData.get("dataPagamento") || new Date().toISOString().slice(0, 10));
  const formaPagamento = String(formData.get("formaPagamento") || "");
  const observacao = String(formData.get("observacao") || "") || null;

  // vencimento padrão: 30 dias após o pagamento
  const proximoVencimento = new Date(dataPagamento + "T00:00:00");
  proximoVencimento.setDate(proximoVencimento.getDate() + 30);

  await supabase.from("pagamentos").insert({
    aluno_id: alunoId,
    valor,
    data_pagamento: dataPagamento,
    forma_pagamento: formaPagamento,
    observacao,
    proximo_vencimento: proximoVencimento.toISOString().slice(0, 10),
    registrado_por: personal.id,
  });

  revalidatePath("/financeiro");
  revalidatePath(`/alunos/${alunoId}`);
}

export async function pedirAtualizacao(formData: FormData) {
  await requirePersonal();
  const supabase = await createClient();
  const alunoId = String(formData.get("alunoId") || "");

  const { data: aluno } = await supabase.from("alunos").select("nome").eq("id", alunoId).maybeSingle();
  if (!aluno) return;

  await notificarAluno(alunoId, {
    tipo: "pedido_atualizacao",
    titulo: "Hora de atualizar seus dados",
    mensagem: "Seu personal pediu que você atualize peso, medidas e fotos.",
    link: "/medidas",
  });

  await supabase
    .from("alunos")
    .update({ pedido_atualizacao_enviado_em: new Date().toISOString() })
    .eq("id", alunoId);

  revalidatePath(`/alunos/${alunoId}`);
}

export async function salvarAnotacoes(formData: FormData) {
  await requirePersonal();
  const supabase = await createClient();
  const alunoId = String(formData.get("alunoId") || "");
  const anotacoes = String(formData.get("anotacoes") || "");

  await supabase.from("alunos").update({ anotacoes_internas: anotacoes }).eq("id", alunoId);
  revalidatePath(`/alunos/${alunoId}`);
}
