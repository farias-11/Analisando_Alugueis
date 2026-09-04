"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAluno } from "@/lib/data/current-user";
import { validarSenha } from "@/lib/password";
import { revalidatePath } from "next/cache";
import { TIPOS_NOTIFICACAO_ALUNO } from "@/lib/constantes";
import { sanitizeFileName } from "@/lib/utils";

export type TrocarSenhaState = { error?: string; ok?: boolean } | undefined;

export async function trocarSenha(
  _prevState: TrocarSenhaState,
  formData: FormData
): Promise<TrocarSenhaState> {
  const novaSenha = String(formData.get("novaSenha") || "");
  const confirmar = String(formData.get("confirmarSenha") || "");

  const erroSenha = validarSenha(novaSenha);
  if (erroSenha) return { error: erroSenha };
  if (novaSenha !== confirmar) return { error: "As senhas não coincidem." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) return { error: "Não foi possível trocar a senha." };

  return { ok: true };
}

export async function atualizarFotoAluno(formData: FormData) {
  const { aluno } = await requireAluno();
  const foto = formData.get("foto") as File | null;
  if (!foto || foto.size === 0) return;

  const admin = createAdminClient();
  const path = `aluno/${aluno.id}/${Date.now()}-${sanitizeFileName(foto.name)}`;
  const { data: upload, error } = await admin.storage
    .from("avatares")
    .upload(path, foto, { contentType: foto.type });
  if (error || !upload) return;

  const { data: pub } = admin.storage.from("avatares").getPublicUrl(upload.path);
  // aluno não tem policy de update na própria linha de "alunos" (só select) —
  // usa o client admin, já criado acima pro upload da foto.
  await admin.from("alunos").update({ foto_url: pub.publicUrl }).eq("id", aluno.id);

  revalidatePath("/conta");
}

export async function atualizarPreferenciasNotificacaoAluno(formData: FormData) {
  const { aluno } = await requireAluno();

  const preferencias: Record<string, boolean> = {};
  for (const { tipo } of TIPOS_NOTIFICACAO_ALUNO) {
    preferencias[tipo] = formData.get(`pref_${tipo}`) === "on";
  }

  // idem: aluno só tem select na própria linha de "alunos", update precisa
  // do client admin.
  await createAdminClient().from("alunos").update({ notificacoes_preferencias: preferencias }).eq("id", aluno.id);
  revalidatePath("/conta");
}
