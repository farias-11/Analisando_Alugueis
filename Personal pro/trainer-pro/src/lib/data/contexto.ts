import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface ContextoAluno {
  exerciciosEvoluindo: { nome: string; percentual: number }[];
  ticketsRecentes: { exercicioNome: string; descricao: string; data: string }[];
  restricoes: string | null;
}

/** Painel "Contexto do aluno" ao lado do editor de treino: o que mais evoluiu de
 * carga, tickets de dor recentes (pra evitar/adaptar) e restrições da anamnese —
 * pra não precisar ficar pulando entre telas ao montar o treino. */
export async function getContextoAluno(alunoId: string): Promise<ContextoAluno> {
  const supabase = await createClient();
  const trintaDiasAtras = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sessentaDiasAtras = new Date(Date.now() - 60 * 86_400_000).toISOString();

  const { data: execs } = await supabase
    .from("execucoes")
    .select("carga, data, aula_exercicios(exercicios(nome))")
    .eq("aluno_id", alunoId)
    .gte("data", sessentaDiasAtras)
    .not("carga", "is", null);

  type Linha = { carga: number; data: string; aula_exercicios: { exercicios: { nome: string } | null } | null };
  const linhas = (execs ?? []) as unknown as Linha[];

  const porExercicio = new Map<string, { atual: number[]; anterior: number[] }>();
  for (const l of linhas) {
    const nome = l.aula_exercicios?.exercicios?.nome;
    if (!nome) continue;
    const bucket = porExercicio.get(nome) ?? { atual: [], anterior: [] };
    if (l.data >= trintaDiasAtras) bucket.atual.push(l.carga);
    else bucket.anterior.push(l.carga);
    porExercicio.set(nome, bucket);
  }

  const media = (arr: number[]) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);

  const exerciciosEvoluindo = Array.from(porExercicio.entries())
    .map(([nome, { atual, anterior }]) => {
      const mAtual = media(atual);
      const mAnterior = media(anterior);
      if (mAtual === null || mAnterior === null || mAnterior === 0) return null;
      return { nome, percentual: Math.round(((mAtual - mAnterior) / mAnterior) * 100) };
    })
    .filter((x): x is { nome: string; percentual: number } => x !== null && x.percentual > 0)
    .sort((a, b) => b.percentual - a.percentual)
    .slice(0, 3);

  const { data: tickets } = await supabase
    .from("tickets")
    .select("exercicio_nome, descricao, created_at")
    .eq("aluno_id", alunoId)
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: aluno } = await supabase.from("alunos").select("restricoes").eq("id", alunoId).maybeSingle();

  return {
    exerciciosEvoluindo,
    ticketsRecentes: (tickets ?? []).map((t) => ({
      exercicioNome: t.exercicio_nome,
      descricao: t.descricao,
      data: t.created_at,
    })),
    restricoes: aluno?.restricoes ?? null,
  };
}
