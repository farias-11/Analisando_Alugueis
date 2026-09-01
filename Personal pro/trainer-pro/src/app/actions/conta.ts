"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAluno } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

export type TrocarSenhaState = { error?: string; ok?: boolean } | undefined;

export async function trocarSenha(
  _prevState: TrocarSenhaState,
  formData: FormData
): Promise<TrocarSenhaState> {
  const novaSenha = String(formData.get("novaSenha") || "");
  const confirmar = String(formData.get("confirmarSenha") || "");

  if (novaSenha.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
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
  const path = `aluno/${aluno.id}/${Date.now()}-${foto.name}`;
  const { data: upload, error } = await admin.storage
    .from("avatares")
    .upload(path, foto, { contentType: foto.type });
  if (error || !upload) return;

  const { data: pub } = admin.storage.from("avatares").getPublicUrl(upload.path);
  const supabase = await createClient();
  await supabase.from("alunos").update({ foto_url: pub.publicUrl }).eq("id", aluno.id);

  revalidatePath("/conta");
}
