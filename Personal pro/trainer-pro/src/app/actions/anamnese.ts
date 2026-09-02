"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AnamneseState = { error?: string } | undefined;

const CAMPOS_TEXTO = [
  "idade",
  "profissao",
  "profissao_outra",
  "nivel_atividade",
  "doencas_outra",
  "medicamentos_usa",
  "medicamentos_detalhe",
  "cirurgias_teve",
  "cirurgias_detalhe",
  "lesoes_dores_outra",
  "fisioterapia_fez",
  "fisioterapia_detalhe",
  "fumante",
  "alcool",
  "sono",
  "estresse",
  "objetivo_principal",
  "experiencia_previa",
  "experiencia_previa_detalhe",
  "observacoes",
] as const;

const CAMPOS_MULTIPLOS = ["doencas", "lesoes_dores", "medicamentos_tipos", "cirurgias_tipos", "fisioterapia_tipos"] as const;

export async function enviarAnamnese(
  _prevState: AnamneseState,
  formData: FormData
): Promise<AnamneseState> {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  const respostas: Record<string, string | string[]> = {};
  for (const campo of CAMPOS_TEXTO) {
    respostas[campo] = String(formData.get(campo) || "");
  }
  for (const campo of CAMPOS_MULTIPLOS) {
    respostas[campo] = formData.getAll(campo).map(String);
  }
  // "Outra" no select de profissão é só um gatilho de UI pro campo de texto
  // livre — o que fica salvo é o texto digitado, não o literal "Outra".
  if (respostas.profissao === "Outra") {
    respostas.profissao = String(formData.get("profissao_outra") || "");
  }
  delete respostas.profissao_outra;

  const { error } = await supabase.from("anamneses").upsert(
    {
      aluno_id: aluno.id,
      respostas,
      concluida: true,
      data_preenchimento: new Date().toISOString(),
    },
    { onConflict: "aluno_id" }
  );

  if (error) {
    return { error: "Não foi possível enviar sua anamnese. Tente novamente." };
  }

  revalidatePath("/home");
  redirect("/home");
}
