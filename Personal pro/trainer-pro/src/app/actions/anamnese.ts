"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type AnamneseState = { error?: string } | undefined;

const CAMPOS = [
  "idade",
  "profissao",
  "nivel_atividade",
  "doencas",
  "medicamentos",
  "cirurgias",
  "lesoes_dores",
  "fisioterapia",
  "fumante",
  "alcool",
  "sono",
  "estresse",
  "objetivo_principal",
  "experiencia_previa",
  "observacoes",
] as const;

export async function enviarAnamnese(
  _prevState: AnamneseState,
  formData: FormData
): Promise<AnamneseState> {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  const respostas: Record<string, string> = {};
  for (const campo of CAMPOS) {
    respostas[campo] = String(formData.get(campo) || "");
  }

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
