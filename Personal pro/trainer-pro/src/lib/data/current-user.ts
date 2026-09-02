import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Admin, Aluno, Personal } from "@/lib/types";

// Usado nos layouts (aluno) e (personal) para garantir que quem acessou a rota
// realmente tem o papel esperado — a checagem consulta a tabela real (protegida
// por RLS), nunca metadata que o próprio usuário poderia editar.
//
// supabase.auth.getUser() sempre faz uma chamada de rede pro servidor de auth
// (revalida o JWT, por segurança — diferente de getSession() que só lê o
// cookie local). Sem cache(), toda página pagava essa chamada de novo mesmo
// já tendo sido feita no layout que a envolve (layout chama requireAluno(),
// a própria página chama requireAluno() de novo) — cada navegação multiplicava
// isso por 2-3x à toa. cache() do React garante que só a primeira chamada de
// cada uma dessas funções por request realmente vai à rede/banco; chamadas
// seguintes no mesmo request reaproveitam o resultado.

const getUsuarioAutenticado = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireAluno = cache(async (): Promise<{ aluno: Aluno; email: string }> => {
  const user = await getUsuarioAutenticado();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: aluno } = await supabase
    .from("alunos")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!aluno) redirect("/login");

  return { aluno: aluno as Aluno, email: user.email ?? "" };
});

export const requirePersonal = cache(async (): Promise<{ personal: Personal; email: string }> => {
  const user = await getUsuarioAutenticado();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: personal } = await supabase
    .from("personals")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!personal) redirect("/home");

  return { personal: personal as Personal, email: user.email ?? "" };
});

/** Checa se o usuário logado também é admin (dono/responsável pelo app) —
 * usado só pra mostrar/esconder o atalho pro painel de suporte interno, não
 * como fonte de verdade de segurança (isso é a policy is_admin() no banco). */
export const souAdmin = cache(async (): Promise<boolean> => {
  const user = await getUsuarioAutenticado();
  if (!user) return false;

  const supabase = await createClient();
  const { data } = await supabase.from("admins").select("id").eq("id", user.id).maybeSingle();
  return !!data;
});

export const requireAdmin = cache(async (): Promise<{ admin: Admin; email: string }> => {
  const user = await getUsuarioAutenticado();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: admin } = await supabase.from("admins").select("*").eq("id", user.id).maybeSingle();

  if (!admin) redirect("/login");

  return { admin: admin as Admin, email: user.email ?? "" };
});
