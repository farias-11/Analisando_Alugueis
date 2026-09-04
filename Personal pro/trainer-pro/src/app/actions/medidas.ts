"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAluno } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";
import { parseDecimalBR, sanitizeFileName } from "@/lib/utils";

export type SalvarMedidasState = { error?: string; ok?: boolean } | undefined;

const numOrNull = parseDecimalBR;

export async function salvarMedidas(
  _prevState: SalvarMedidasState,
  formData: FormData
): Promise<SalvarMedidasState> {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  const data = String(formData.get("data") || new Date().toISOString().slice(0, 10));

  const { error } = await supabase.from("medidas").insert({
    aluno_id: aluno.id,
    data,
    peso: numOrNull(formData.get("peso")),
    percentual_gordura: numOrNull(formData.get("percentual_gordura")),
    peito: numOrNull(formData.get("peito")),
    cintura: numOrNull(formData.get("cintura")),
    quadril: numOrNull(formData.get("quadril")),
    coxa_direita: numOrNull(formData.get("coxa_direita")),
    coxa_esquerda: numOrNull(formData.get("coxa_esquerda")),
    braco: numOrNull(formData.get("braco")),
  });

  if (error) return { error: "Não foi possível salvar suas medidas." };

  // aluno não tem policy de update na própria linha de "alunos" (só select) —
  // usa o client admin pra esse campo específico, igual já é feito em outros
  // pontos de self-service do aluno (ver conta.ts, lgpd.ts).
  await createAdminClient()
    .from("alunos")
    .update({ ultima_atualizacao_medidas: new Date().toISOString() })
    .eq("id", aluno.id);

  const foto = formData.get("foto") as File | null;
  if (foto && foto.size > 0) {
    // bucket privado (foto de corpo = dado de saúde) — upload via admin,
    // guardamos só o path; a URL é resolvida sob demanda com createSignedUrl
    const path = `${aluno.id}/${Date.now()}-${sanitizeFileName(foto.name)}`;
    const admin = createAdminClient();
    const { data: upload, error: uploadError } = await admin.storage
      .from("fotos-progresso")
      .upload(path, foto, { contentType: foto.type });
    if (uploadError || !upload) {
      revalidatePath("/medidas");
      return { error: "Medidas salvas, mas a foto não pôde ser enviada. Tente enviá-la de novo." };
    }
    await supabase.from("fotos_progresso").insert({ aluno_id: aluno.id, url: upload.path, data });
  }

  revalidatePath("/medidas");
  revalidatePath("/home");
  return { ok: true };
}

export type EnviarFotoAnguloState = { error?: string; ok?: boolean } | undefined;

/** Upload rápido de uma foto pra um bloco específico solicitado pelo personal
 * (ex: "Frente", "Lado") — separado do formulário de medidas porque aqui o
 * aluno só quer trocar uma foto, sem preencher peso/circunferências de novo. */
export async function enviarFotoAngulo(
  _prevState: EnviarFotoAnguloState,
  formData: FormData
): Promise<EnviarFotoAnguloState> {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  const angulo = String(formData.get("angulo") || "").trim();
  const foto = formData.get("foto") as File | null;
  if (!angulo) return { error: "Ângulo inválido." };
  if (!foto || foto.size === 0) return { error: "Selecione uma foto." };

  const path = `${aluno.id}/${Date.now()}-${foto.name}`;
  const admin = createAdminClient();
  const { data: upload, error: uploadError } = await admin.storage
    .from("fotos-progresso")
    .upload(path, foto, { contentType: foto.type });
  if (uploadError || !upload) return { error: "Não foi possível enviar a foto. Tente novamente." };

  const { error } = await supabase.from("fotos_progresso").insert({
    aluno_id: aluno.id,
    url: upload.path,
    angulo,
  });
  if (error) return { error: "Não foi possível salvar a foto." };

  revalidatePath("/medidas");
  return { ok: true };
}
