"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarSenha } from "@/lib/password";
import { redirect } from "next/navigation";

export type AceitarConviteState = { error?: string } | undefined;

// Chamada na tela "Aceitar convite" — o aluno já está autenticado (sessão criada
// pelo link mágico do convite). Aqui ele define a senha e confirma o consentimento
// específico de dados de saúde (LGPD), separado de qualquer aceite genérico de termos.
export async function aceitarConvite(
  _prevState: AceitarConviteState,
  formData: FormData
): Promise<AceitarConviteState> {
  const alunoIdParam = String(formData.get("alunoId") || "").trim() || null;
  const senha = String(formData.get("senha") || "");
  const confirmarSenha = String(formData.get("confirmarSenha") || "");
  const aceitaTermos = formData.get("aceitaTermos") === "on";
  const consenteDadosSaude = formData.get("consenteDadosSaude") === "on";

  const erroSenha = validarSenha(senha);
  if (erroSenha) {
    return { error: erroSenha };
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
  // alunoId (do link gerado pelo personal) resolve sem ambiguidade — o mesmo
  // e-mail pode estar pendente em dois personals ao mesmo tempo, então cair
  // só no e-mail pode achar a linha errada (ou nenhuma, se houver duas).
  // Sem alunoId (link antigo) cai no fallback por e-mail, igual antes.
  const { data: aluno, error: findError } = alunoIdParam
    ? await admin.from("alunos").select("id, email, status_convite").eq("id", alunoIdParam).maybeSingle()
    : await admin.from("alunos").select("id, email, status_convite").ilike("email", user.email).eq("status_convite", "pendente").maybeSingle();

  if (findError || !aluno || aluno.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "Não encontramos um convite pendente para este e-mail." };
  }
  if (aluno.status_convite === "aceito") {
    redirect("/home");
  }

  // essa conta do Supabase Auth (mesmo e-mail) já pode estar vinculada a OUTRO
  // aluno — do mesmo personal ou de um personal diferente. Sem essa trava,
  // aceitar aqui desvincularia silenciosamente o outro aluno da própria conta.
  const { data: outroAluno } = await admin.from("alunos").select("id").eq("auth_user_id", user.id).neq("id", aluno.id).maybeSingle();
  if (outroAluno) {
    return { error: "Esse e-mail já está vinculado a outro aluno no Duo Flow. Peça pro seu personal usar outro e-mail." };
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
