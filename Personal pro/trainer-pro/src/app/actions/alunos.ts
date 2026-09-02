"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePersonal } from "@/lib/data/current-user";
import { notificarAluno } from "@/lib/notificar";
import { calcularProximoVencimento } from "@/lib/planos-utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ConvidarAlunoState =
  | { error: string }
  | { sucesso: true; alunoId: string; alunoNome: string; whatsapp: string | null; conviteLink: string }
  | undefined;

type SupaClient = Awaited<ReturnType<typeof createClient>>;

/** Gera o link que o personal manda pro aluno (convite ou acesso direto).
 *
 * "invite" só funciona pra e-mail 100% novo no Supabase Auth. Na prática
 * isso falha toda vez que o e-mail já tem conta — o caso mais comum é um
 * aluno excluído e recriado (ou um convite antigo reenviado): a conta no
 * Auth continua existindo mesmo depois do aluno sumir da tabela `alunos`,
 * então "convidar" de novo sempre dava erro genérico. Em vez de falhar,
 * detecta esse caso (código "email_exists") e gera um link de ACESSO
 * (magiclink) pra essa conta que já existe, vinculando o aluno atual a ela
 * — desde que nenhum outro aluno já esteja usando essa conta.
 */
async function gerarLinkAcesso(
  supabase: SupaClient,
  alunoId: string,
  email: string
): Promise<{ link: string } | { erro: string }> {
  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { data: convite, error: erroConvite } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/convite/aceitar` },
  });
  if (!erroConvite && convite) {
    return { link: convite.properties.action_link };
  }
  if (erroConvite?.code !== "email_exists") {
    return { erro: "Não foi possível gerar o link agora. Tente de novo." };
  }

  const { data: acesso, error: erroAcesso } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${siteUrl}/auth/callback?next=/home` },
  });
  if (erroAcesso || !acesso) {
    return { erro: "Esse e-mail já tem uma conta no Trainer Pro, mas não consegui gerar o link de acesso. Tente de novo." };
  }

  const authUserId = acesso.user.id;
  const { data: outroAluno } = await supabase
    .from("alunos")
    .select("id")
    .eq("auth_user_id", authUserId)
    .neq("id", alunoId)
    .maybeSingle();
  if (outroAluno) {
    return { erro: "Esse e-mail já está vinculado a outro aluno no Trainer Pro. Peça pro aluno usar outro e-mail." };
  }

  await supabase.from("alunos").update({ auth_user_id: authUserId, status_convite: "aceito" }).eq("id", alunoId);
  return { link: acesso.properties.action_link };
}

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
  const planoId = String(formData.get("planoId") || "").trim() || null;

  if (!nome || !email) {
    return { error: "Nome e e-mail são obrigatórios." };
  }

  const plano = planoId ? (await supabase.from("planos").select("valor").eq("id", planoId).maybeSingle()).data : null;

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
      plano_id: planoId,
      pagamento_valor: plano?.valor ?? null,
    })
    .select()
    .single();

  if (error || !aluno) {
    if (error?.code === "23505") {
      return { error: "Já existe um aluno com esse e-mail." };
    }
    return { error: "Não foi possível criar o convite. Tente novamente." };
  }

  // WhatsApp é o canal principal do convite (handoff, seção 4): gera o link
  // sem disparar e-mail automático — o personal manda ele mesmo por WhatsApp.
  // O e-mail continua disponível, mas como opção secundária (reenviarConvite).
  const resultado = await gerarLinkAcesso(supabase, aluno.id, email);
  if ("erro" in resultado) {
    // aluno já foi criado no banco — o personal pode gerar o link de novo na ficha dele
    return { error: `Aluno criado, mas: ${resultado.erro}` };
  }

  revalidatePath("/alunos");
  return {
    sucesso: true,
    alunoId: aluno.id,
    alunoNome: aluno.nome,
    whatsapp: aluno.whatsapp,
    conviteLink: resultado.link,
  };
}

export async function marcarComoPago(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const alunoId = String(formData.get("alunoId") || "");
  const valor = Number(formData.get("valor") || 0);
  const dataPagamento = String(formData.get("dataPagamento") || new Date().toISOString().slice(0, 10));
  const formaPagamento = String(formData.get("formaPagamento") || "");
  const observacao = String(formData.get("observacao") || "") || null;

  const { data: aluno } = await supabase
    .from("alunos")
    .select("planos(recorrencia_meses, dia_pagamento)")
    .eq("id", alunoId)
    .maybeSingle();
  const plano = (aluno as unknown as { planos: { recorrencia_meses: number; dia_pagamento: number | null } | null } | null)
    ?.planos;
  const proximoVencimento = calcularProximoVencimento(dataPagamento, plano);

  await supabase.from("pagamentos").insert({
    aluno_id: alunoId,
    valor,
    data_pagamento: dataPagamento,
    forma_pagamento: formaPagamento,
    observacao,
    proximo_vencimento: proximoVencimento,
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

export async function atualizarConfiguracoesAluno(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const alunoId = String(formData.get("alunoId") || "");

  const anamneseAtiva = formData.get("anamneseAtiva") === "on";
  const bioimpedanciaAtiva = formData.get("bioimpedanciaAtiva") === "on";
  const bioimpedanciaFrequencia = formData.get("bioimpedanciaFrequencia");
  const duracaoCiclo = Number(formData.get("duracaoCiclo") || 4);

  await supabase
    .from("alunos")
    .update({
      anamnese_ativa: anamneseAtiva,
      bioimpedancia_ativa: bioimpedanciaAtiva,
      bioimpedancia_frequencia_dias: bioimpedanciaAtiva ? Number(bioimpedanciaFrequencia) || 30 : null,
      ciclo_duracao_padrao_semanas: duracaoCiclo,
    })
    .eq("id", alunoId)
    .eq("personal_id", personal.id);

  revalidatePath(`/alunos/${alunoId}`);
}

export async function atualizarFotosSolicitadas(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const alunoId = String(formData.get("alunoId") || "");

  const selecionados = formData.getAll("angulos").map(String);

  await supabase
    .from("alunos")
    .update({ fotos_solicitadas: selecionados })
    .eq("id", alunoId)
    .eq("personal_id", personal.id);

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

export async function reenviarConvite(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const alunoId = String(formData.get("alunoId") || "");

  const { data: aluno } = await supabase
    .from("alunos")
    .select("email")
    .eq("id", alunoId)
    .eq("personal_id", personal.id)
    .maybeSingle();
  if (!aluno) return;

  const admin = createAdminClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  await admin.auth.admin.inviteUserByEmail(aluno.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/convite/aceitar`,
  });

  await supabase.from("alunos").update({ convite_enviado_em: new Date().toISOString() }).eq("id", alunoId);

  revalidatePath(`/alunos/${alunoId}`);
}

export type GerarLinkConviteState = { error: string } | { conviteLink: string } | undefined;

/** Gera um novo link de convite pra reenviar por WhatsApp (canal principal) a
 * partir da ficha do aluno — sem disparar e-mail. Usa a mesma sessão de
 * convite já criada no auth (generateLink não recria o usuário). */
export async function gerarLinkConviteWhatsapp(
  _prevState: GerarLinkConviteState,
  formData: FormData
): Promise<GerarLinkConviteState> {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const alunoId = String(formData.get("alunoId") || "");

  const { data: aluno } = await supabase
    .from("alunos")
    .select("email")
    .eq("id", alunoId)
    .eq("personal_id", personal.id)
    .maybeSingle();
  if (!aluno) return { error: "Aluno não encontrado." };

  const resultado = await gerarLinkAcesso(supabase, alunoId, aluno.email);
  if ("erro" in resultado) return { error: resultado.erro };

  await supabase.from("alunos").update({ convite_enviado_em: new Date().toISOString() }).eq("id", alunoId);
  revalidatePath(`/alunos/${alunoId}`);

  return { conviteLink: resultado.link };
}

export async function cancelarConvite(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const alunoId = String(formData.get("alunoId") || "");

  await supabase.from("alunos").delete().eq("id", alunoId).eq("personal_id", personal.id).eq("status_convite", "pendente");

  revalidatePath("/alunos");
  redirect("/alunos");
}

// Ativo/inativo é sobre a relação de treino em si (aluno pausou, saiu, etc.) —
// só faz sentido depois que o convite foi aceito, então a UI só mostra essa
// ação nesse ponto. Um aluno inativo some do cálculo de recebíveis do
// financeiro (ver financeiro/page.tsx) mas mantém todo o histórico.
export async function alternarStatusAluno(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const alunoId = String(formData.get("alunoId") || "");
  const novoStatus = formData.get("novoStatus") === "inativo" ? "inativo" : "ativo";

  await supabase
    .from("alunos")
    .update({ status: novoStatus })
    .eq("id", alunoId)
    .eq("personal_id", personal.id);

  revalidatePath(`/alunos/${alunoId}`);
  revalidatePath("/alunos");
}

// ---------------------------------------------------------------------------
// Ações em lote (handoff, seção 3.1) — versão rápida das ações que já existem
// individualmente. "Marcar como pago em lote" usa o valor de pagamento
// cadastrado do aluno e Pix como forma padrão; pra ajustar valor/forma
// específico continua existindo o fluxo individual em cada ficha.
// ---------------------------------------------------------------------------

export async function marcarVariosComoPago(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const alunoIds = formData.getAll("alunoIds").map(String);
  if (!alunoIds.length) return;

  const { data: alunos } = await supabase
    .from("alunos")
    .select("id, pagamento_valor, planos(recorrencia_meses, dia_pagamento)")
    .in("id", alunoIds)
    .eq("personal_id", personal.id);

  const hojeStr = new Date().toISOString().slice(0, 10);

  const linhas = ((alunos ?? []) as unknown as { id: string; pagamento_valor: number | null; planos: { recorrencia_meses: number; dia_pagamento: number | null } | null }[]).map((a) => ({
    aluno_id: a.id,
    valor: a.pagamento_valor ?? 0,
    data_pagamento: hojeStr,
    forma_pagamento: "Pix",
    proximo_vencimento: calcularProximoVencimento(hojeStr, a.planos),
    registrado_por: personal.id,
  }));
  if (linhas.length) await supabase.from("pagamentos").insert(linhas);

  revalidatePath("/financeiro");
  revalidatePath("/alunos");
  revalidatePath("/dashboard");
}

// Lembrete genérico em lote (ex.: aderência em queda) — cobrança de
// pagamento tem sua própria ação (lembretePagamento, seção 3.3).
export async function enviarLembreteEmLote(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const alunoIds = formData.getAll("alunoIds").map(String);
  if (!alunoIds.length) return;

  const { data: alunos } = await supabase.from("alunos").select("id").in("id", alunoIds).eq("personal_id", personal.id);

  await Promise.all(
    (alunos ?? []).map((a) =>
      notificarAluno(a.id, {
        tipo: "lembrete_personal",
        titulo: "Seu personal quer saber como você está",
        mensagem: "Faz um tempo que você não treina ou atualiza seus dados — dá uma olhada quando puder.",
        link: "/home",
      })
    )
  );

  revalidatePath("/alunos");
}
