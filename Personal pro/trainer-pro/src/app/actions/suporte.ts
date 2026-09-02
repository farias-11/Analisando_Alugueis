"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAluno, requirePersonal, requireAdmin } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

export type AbrirTicketSuporteState = { error?: string; ok?: boolean } | undefined;

/** Sobe cada print pro storage em paralelo. Antes essa função engolia
 * qualquer erro em silêncio (retornava null e o ticket ia sem o anexo, sem
 * ninguém saber o motivo) — agora loga o erro real no servidor e devolve só
 * os que realmente subiram, pra quem chama decidir o que fazer com o resto. */
async function uploadPrints(autorId: string, fotos: File[]): Promise<string[]> {
  const validas = fotos.filter((f) => f && f.size > 0);
  if (validas.length === 0) return [];

  const admin = createAdminClient();
  const resultados = await Promise.all(
    validas.map(async (foto) => {
      const path = `${autorId}/${Date.now()}-${foto.name}`;
      const { data: upload, error } = await admin.storage
        .from("tickets")
        .upload(`suporte/${path}`, foto, { contentType: foto.type });
      if (error || !upload) {
        console.error(`[suporte] falha ao subir print "${foto.name}" (${foto.size} bytes):`, error);
        return null;
      }
      return upload.path;
    })
  );

  return resultados.filter((p): p is string => p !== null);
}

export async function abrirTicketSuporteAluno(
  _prevState: AbrirTicketSuporteState,
  formData: FormData
): Promise<AbrirTicketSuporteState> {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  const categoria = String(formData.get("categoria") || "bug");
  const descricao = String(formData.get("descricao") || "").trim();
  const fotos = formData.getAll("prints") as File[];

  if (!descricao) return { error: "Descreva o problema ou sugestão." };

  const printPaths = await uploadPrints(aluno.id, fotos);
  if (fotos.some((f) => f && f.size > 0) && printPaths.length === 0) {
    return { error: "Não foi possível enviar a(s) imagem(ns). Tente com fotos menores ou envie só a descrição." };
  }

  const { error } = await supabase.from("tickets_suporte").insert({
    autor_tipo: "aluno",
    aluno_id: aluno.id,
    categoria,
    descricao,
    print_urls: printPaths,
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
  const fotos = formData.getAll("prints") as File[];

  if (!descricao) return { error: "Descreva o problema ou sugestão." };

  const printPaths = await uploadPrints(personal.id, fotos);
  if (fotos.some((f) => f && f.size > 0) && printPaths.length === 0) {
    return { error: "Não foi possível enviar a(s) imagem(ns). Tente com fotos menores ou envie só a descrição." };
  }

  const { error } = await supabase.from("tickets_suporte").insert({
    autor_tipo: "personal",
    personal_id: personal.id,
    categoria,
    descricao,
    print_urls: printPaths,
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
