"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/data/current-user";
import { notificarPersonal } from "@/lib/notificar";
import { revalidatePath } from "next/cache";

export async function revogarConsentimentoSaude() {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  await supabase
    .from("alunos")
    .update({
      consentimento_saude_aceito: false,
      consentimento_saude_revogado_em: new Date().toISOString(),
    })
    .eq("id", aluno.id);

  await notificarPersonal(aluno.personal_id, {
    tipo: "consentimento_revogado",
    titulo: `${aluno.nome} revogou o consentimento de dados de saúde`,
    link: `/alunos/${aluno.id}`,
  });

  revalidatePath("/dados");
}

export async function solicitarExclusaoConta() {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  await supabase
    .from("alunos")
    .update({ exclusao_solicitada_em: new Date().toISOString() })
    .eq("id", aluno.id);

  await notificarPersonal(aluno.personal_id, {
    tipo: "exclusao_solicitada",
    titulo: `${aluno.nome} solicitou a exclusão da conta`,
    link: `/alunos/${aluno.id}`,
  });

  revalidatePath("/dados");
}
