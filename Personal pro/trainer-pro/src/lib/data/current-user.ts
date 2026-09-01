import "server-only";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Aluno, Personal } from "@/lib/types";

// Usado nos layouts (aluno) e (personal) para garantir que quem acessou a rota
// realmente tem o papel esperado — a checagem consulta a tabela real (protegida
// por RLS), nunca metadata que o próprio usuário poderia editar.

export async function requireAluno(): Promise<{ aluno: Aluno; email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: aluno } = await supabase
    .from("alunos")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!aluno) redirect("/login");

  return { aluno: aluno as Aluno, email: user.email ?? "" };
}

export async function requirePersonal(): Promise<{ personal: Personal; email: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: personal } = await supabase
    .from("personals")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!personal) redirect("/home");

  return { personal: personal as Personal, email: user.email ?? "" };
}
