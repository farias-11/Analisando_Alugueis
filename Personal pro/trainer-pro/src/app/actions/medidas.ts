"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAluno } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

export type SalvarMedidasState = { error?: string; ok?: boolean } | undefined;

const numOrNull = (v: FormDataEntryValue | null) =>
  v && String(v).trim() !== "" ? Number(v) : null;

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

  const foto = formData.get("foto") as File | null;
  if (foto && foto.size > 0) {
    // bucket privado (foto de corpo = dado de saúde) — upload via admin,
    // guardamos só o path; a URL é resolvida sob demanda com createSignedUrl
    const path = `${aluno.id}/${Date.now()}-${foto.name}`;
    const admin = createAdminClient();
    const { data: upload } = await admin.storage
      .from("fotos-progresso")
      .upload(path, foto, { contentType: foto.type });
    if (upload) {
      await supabase.from("fotos_progresso").insert({ aluno_id: aluno.id, url: upload.path, data });
    }
  }

  await supabase
    .from("alunos")
    .update({ ultima_atualizacao_medidas: new Date().toISOString() })
    .eq("id", aluno.id);

  revalidatePath("/medidas");
  revalidatePath("/home");
  return { ok: true };
}
