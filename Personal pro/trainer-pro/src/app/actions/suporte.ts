"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAluno, requirePersonal, requireAdmin } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

export type AbrirTicketSuporteState = { error?: string; ok?: boolean } | undefined;

async function uploadPrint(autorId: string, foto: File | null): Promise<string | null> {
  if (!foto || foto.size === 0) return null;
  const admin = createAdminClient();
  const path = `${autorId}/${Date.now()}-${foto.name}`;
  const { data: upload, error } = await admin.storage
    .from("tickets")
    .upload(`suporte/${path}`, foto, { contentType: foto.type });
  if (error || !upload) return null;
  return upload.path;
}

export async function abrirTicketSuporteAluno(
  _prevState: AbrirTicketSuporteState,
  formData: FormData
): Promise<AbrirTicketSuporteState> {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  const categoria = String(formData.get("categoria") || "bug");
  const descricao = String(formData.get("descricao") || "").trim();
  const foto = formData.get("print") as File | null;

  if (!descricao) return { error: "Descreva o problema ou sugestão." };

  const printPath = await uploadPrint(aluno.id, foto);

  const { error } = await supabase.from("tickets_suporte").insert({
    autor_tipo: "aluno",
    aluno_id: aluno.id,
    categoria,
    descricao,
    print_url: printPath,
  });

  if (error) return { error: "Não foi possível enviar. Tente novamente." };

  revalidatePath("/ajuda");
  return { ok: true };
}

export async function abrirTicketSuportePersonal(
  _prevState: AbrirTicketSuporteState,
  formData: FormData
): Promise<AbrirTicketSuporteState> {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const categoria = String(formData.get("categoria") || "bug");
  const descricao = String(formData.get("descricao") || "").trim();
  const foto = formData.get("print") as File | null;

  if (!descricao) return { error: "Descreva o problema ou sugestão." };

  const printPath = await uploadPrint(personal.id, foto);

  const { error } = await supabase.from("tickets_suporte").insert({
    autor_tipo: "personal",
    personal_id: personal.id,
    categoria,
    descricao,
    print_url: printPath,
  });

  if (error) return { error: "Não foi possível enviar. Tente novamente." };

  revalidatePath("/configuracoes");
  return { ok: true };
}

export async function responderTicketSuporte(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const ticketId = String(formData.get("ticketId") || "");
  const resposta = String(formData.get("resposta") || "").trim();
  if (!resposta) return;

  await supabase
    .from("tickets_suporte")
    .update({
      status: "resolvido",
      resposta_admin: resposta,
      resolvido_em: new Date().toISOString(),
    })
    .eq("id", ticketId);

  revalidatePath("/admin/suporte");
}
