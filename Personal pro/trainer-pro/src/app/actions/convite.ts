"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export type AceitarConviteState = { error?: string } | undefined;

// Chamada na tela "Aceitar convite" — o aluno já está autenticado (sessão criada
// pelo link mágico do convite). Aqui ele define a senha e confirma o consentimento
// específico de dados de saúde (LGPD), separado de qualquer aceite genérico de termos.
export async function aceitarConvite(
  _prevState: AceitarConviteState,
  formData: FormData
): Promise<AceitarConviteState> {
  const senha = String(formData.get("senha") || "");
  const confirmarSenha = String(formData.get("confirmarSenha") || "");
  const aceitaTermos = formData.get("aceitaTermos") === "on";
  const consenteDadosSaude = formData.get("consenteDadosSaude") === "on";

  if (senha.length < 8) {
    return { error: "A senha precisa ter pelo menos 8 caracteres." };
  }
  if (senha !== confirmarSenha) {
    return { error: "As senhas não coincidem." };
  }
  if (!aceitaTermos) {
    return { error: "É preciso aceitar os Termos de Uso e a Política de Privacidade." };
  }
  if (!consenteDadosSaude) {
    return {
      error:
        "É preciso consentir com a coleta de dados de saúde (medidas, fotos, relatos de dor) para continuar — esse consentimento é obrigatório pela LGPD e é separado do aceite dos termos gerais.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "Sessão de convite inválida ou expirada. Peça um novo convite ao seu personal." };
  }

  const { error: pwError } = await supabase.auth.updateUser({ password: senha });
  if (pwError) {
    return { error: "Não foi possível definir a senha. Tente novamente." };
  }

  const admin = createAdminClient();
  const { data: aluno, error: findError } = await admin
    .from("alunos")
    .select("id, status_convite")
    .ilike("email", user.email)
    .eq("status_convite", "pendente")
    .maybeSingle();

  if (findError || !aluno) {
    return { error: "Não encontramos um convite pendente para este e-mail." };
  }

  const { error: linkError } = await admin
    .from("alunos")
    .update({
      auth_user_id: user.id,
      status_convite: "aceito",
      consentimento_saude_aceito: true,
      consentimento_saude_data: new Date().toISOString(),
    })
    .eq("id", aluno.id);

  if (linkError) {
    return { error: "Não foi possível concluir seu cadastro. Tente novamente." };
  }

  redirect("/home");
}
