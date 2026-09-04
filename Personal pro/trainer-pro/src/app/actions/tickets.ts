"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAluno, requirePersonal } from "@/lib/data/current-user";
import { mensagemTicketDor, buildWhatsappLink } from "@/lib/whatsapp";
import { notificarAluno, notificarPersonal } from "@/lib/notificar";
import { revalidatePath } from "next/cache";
import { sanitizeFileName } from "@/lib/utils";

export type CriarTicketState = { error?: string; whatsappUrl?: string } | undefined;

export async function criarTicket(
  _prevState: CriarTicketState,
  formData: FormData
): Promise<CriarTicketState> {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  const aulaExercicioId = String(formData.get("aulaExercicioId") || "");
  const exercicioNome = String(formData.get("exercicioNome") || "");
  const aulaNome = String(formData.get("aulaNome") || "");
  const descricao = String(formData.get("descricao") || "").trim();
  const foto = formData.get("foto") as File | null;

  if (!descricao) {
    return { error: "Descreva o que você sentiu." };
  }

  // bucket privado (foto de dor/lesão = dado de saúde) — upload via admin,
  // guardamos só o path; a URL é resolvida sob demanda com createSignedUrl
  let fotoPath: string | null = null;
  if (foto && foto.size > 0) {
    const path = `${aluno.id}/${Date.now()}-${sanitizeFileName(foto.name)}`;
    const admin = createAdminClient();
    const { data: upload, error: uploadError } = await admin.storage
      .from("tickets")
      .upload(path, foto, { contentType: foto.type });
    if (!uploadError && upload) {
      fotoPath = upload.path;
    }
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .insert({
      aluno_id: aluno.id,
      aula_exercicio_id: aulaExercicioId || null,
      exercicio_nome: exercicioNome,
      aula_nome: aulaNome || null,
      descricao,
      foto_url: fotoPath,
    })
    .select()
    .single();

  if (error || !ticket) {
    return { error: "Não foi possível registrar o relato. Tente novamente." };
  }

  // aviso interno para o personal (app + push)
  await notificarPersonal(aluno.personal_id, {
    tipo: "ticket_novo",
    titulo: `Novo relato de dor — ${aluno.nome}`,
    mensagem: `${exercicioNome}: ${descricao}`,
    link: `/alunos/${aluno.id}?aba=tickets`,
  });

  const { data: personal } = await supabase
    .from("personals")
    .select("whatsapp_numero")
    .eq("id", aluno.personal_id)
    .maybeSingle();

  const mensagem = mensagemTicketDor({
    alunoNome: aluno.nome,
    aulaNome,
    exercicioNome,
    descricao,
  });

  const whatsappUrl = personal
    ? buildWhatsappLink(personal.whatsapp_numero, mensagem)
    : undefined;

  revalidatePath("/tickets");
  return { whatsappUrl };
}

export async function resolverTicket(formData: FormData) {
  await requirePersonal();
  const supabase = await createClient();

  const ticketId = String(formData.get("ticketId") || "");
  const observacao = String(formData.get("observacao") || "").trim();

  if (!observacao) return;

  const { data: ticket } = await supabase
    .from("tickets")
    .update({
      status: "resolvido",
      observacao_resolucao: observacao,
      resolvido_em: new Date().toISOString(),
    })
    .eq("id", ticketId)
    .select("aluno_id, exercicio_nome")
    .single();

  if (ticket) {
    await notificarAluno(ticket.aluno_id, {
      tipo: "ticket_resolvido",
      titulo: `Seu relato sobre ${ticket.exercicio_nome} foi respondido`,
      mensagem: observacao,
    });
  }

  revalidatePath("/tickets");
}
