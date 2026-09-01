import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Notificacao } from "@/lib/types";

export async function contarNaoLidasAluno(alunoId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("aluno_id", alunoId)
    .eq("destinatario_tipo", "aluno")
    .eq("lida", false);
  return count ?? 0;
}

export async function contarNaoLidasPersonal(personalId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notificacoes")
    .select("id", { count: "exact", head: true })
    .eq("personal_id", personalId)
    .eq("destinatario_tipo", "personal")
    .eq("lida", false);
  return count ?? 0;
}

export async function listarNotificacoesAluno(alunoId: string): Promise<Notificacao[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("aluno_id", alunoId)
    .eq("destinatario_tipo", "aluno")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as Notificacao[]) ?? [];
}

export async function listarNotificacoesPersonal(personalId: string): Promise<Notificacao[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notificacoes")
    .select("*")
    .eq("personal_id", personalId)
    .eq("destinatario_tipo", "personal")
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as Notificacao[]) ?? [];
}
