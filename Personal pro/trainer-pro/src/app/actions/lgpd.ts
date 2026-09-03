"use server";

import { requireAluno } from "@/lib/data/current-user";
import { createAdminClient } from "@/lib/supabase/admin";
import { notificarPersonal } from "@/lib/notificar";
import { revalidatePath } from "next/cache";
import { PRAZO_EXCLUSAO_DIAS } from "@/lib/constantes";

export async function revogarConsentimentoSaude() {
  const { aluno } = await requireAluno();

  // aluno só tem select na própria linha de "alunos" — sem policy de update,
  // essa chamada ficava um no-op silencioso (sem erro, sem revogar nada de
  // verdade). Update precisa do client admin.
  await createAdminClient()
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

  const agora = new Date();
  await createAdminClient()
    .from("alunos")
    .update({ exclusao_solicitada_em: agora.toISOString() })
    .eq("id", aluno.id);

  const prazo = new Date(agora);
  prazo.setDate(prazo.getDate() + PRAZO_EXCLUSAO_DIAS);
  const prazoFormatado = prazo.toLocaleDateString("pt-BR");

  await notificarPersonal(aluno.personal_id, {
    tipo: "exclusao_solicitada",
    titulo: `${aluno.nome} solicitou a exclusão da conta`,
    mensagem: `Prazo para exclusão efetiva: ${prazoFormatado}, salvo contato em contrário.`,
    link: `/alunos/${aluno.id}`,
  });

  revalidatePath("/dados");
}
