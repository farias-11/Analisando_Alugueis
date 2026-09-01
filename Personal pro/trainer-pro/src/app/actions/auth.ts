"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type LoginState = { error?: string } | undefined;

// Login do Personal — só e-mail/senha, sem cadastro público nem login social,
// conforme regra de negócio fixada no prompt de implementação.
export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") || "").trim();
  const senha = String(formData.get("senha") || "");

  if (!email || !senha) {
    return { error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    return { error: "E-mail ou senha inválidos." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: personal } = await supabase
    .from("personals")
    .select("id")
    .eq("id", user?.id)
    .maybeSingle();

  redirect(personal ? "/dashboard" : "/home");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type EsqueciSenhaState = { error?: string; enviado?: boolean } | undefined;

export async function solicitarRecuperacaoSenha(
  _prevState: EsqueciSenhaState,
  formData: FormData
): Promise<EsqueciSenhaState> {
  const email = String(formData.get("email") || "").trim();
  if (!email) return { error: "Informe seu e-mail." };

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/confirm?next=/redefinir-senha`,
  });

  // sempre "enviado", mesmo se o e-mail não existir — não confirma pra quem
  // está tentando descobrir e-mails cadastrados
  return { enviado: true };
}

export type RedefinirSenhaState = { error?: string } | undefined;

export async function redefinirSenha(
  _prevState: RedefinirSenhaState,
  formData: FormData
): Promise<RedefinirSenhaState> {
  const senha = String(formData.get("senha") || "");
  const confirmarSenha = String(formData.get("confirmarSenha") || "");

  if (senha.length < 8) return { error: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== confirmarSenha) return { error: "As senhas não coincidem." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão de recuperação inválida ou expirada. Solicite um novo link." };

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) return { error: "Não foi possível redefinir a senha. Tente novamente." };

  const { data: personal } = await supabase
    .from("personals")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  redirect(personal ? "/dashboard" : "/home");
}
