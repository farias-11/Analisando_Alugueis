import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getResumoEvolucao } from "@/lib/data/evolucao";
import { getContextoAluno } from "@/lib/data/contexto";
import { getCicloAtivo, getAulasDoCiclo } from "@/lib/data/aluno";
import type { Aluno, Personal } from "@/lib/types";

export interface RelatorioAlunoData {
  aluno: Aluno;
  personal: Personal;
  evolucao: Awaited<ReturnType<typeof getResumoEvolucao>>;
  exerciciosEvoluindo: { nome: string; percentual: number }[];
  medidasRecentes: { data: string; peso: number | null; percentual_gordura: number | null; cintura: number | null }[];
  treinoAtual: { aulaNome: string; exercicios: { nome: string; series: number; repeticoes: string; carga: number | null }[] }[];
  pagamentosRecentes: { data_pagamento: string; valor: number; forma_pagamento: string }[];
}

/** Relatório automático por aluno (handoff 3.5) — reúne o que já existe
 * (evolução, medidas, treino atual, pagamentos) num só lugar pra virar PDF,
 * em vez de calcular algo novo. Geração sob demanda; o envio mensal
 * automático fica pra depois (a especificação já deixa isso como opcional,
 * aguardando confirmação manual do personal antes de enviar). */
export async function getRelatorioAlunoData(alunoId: string, personal: Personal): Promise<RelatorioAlunoData | null> {
  const supabase = await createClient();

  const { data: aluno } = await supabase
    .from("alunos")
    .select("*")
    .eq("id", alunoId)
    .eq("personal_id", personal.id)
    .maybeSingle();
  if (!aluno) return null;

  const [evolucao, contexto, ciclo, { data: medidas }, { data: pagamentos }] = await Promise.all([
    getResumoEvolucao(alunoId),
    getContextoAluno(alunoId),
    getCicloAtivo(alunoId),
    supabase
      .from("medidas")
      .select("data, peso, percentual_gordura, cintura")
      .eq("aluno_id", alunoId)
      .order("data", { ascending: false })
      .limit(5),
    supabase
      .from("pagamentos")
      .select("data_pagamento, valor, forma_pagamento")
      .eq("aluno_id", alunoId)
      .order("data_pagamento", { ascending: false })
      .limit(3),
  ]);

  const aulas = ciclo ? await getAulasDoCiclo(ciclo.id) : [];

  type LinhaAulaExercicio = {
    aula_id: string;
    series: number;
    repeticoes: string;
    carga_inicial: number | null;
    exercicio: { nome: string } | null;
  };

  // uma consulta só pra todas as aulas do ciclo (em vez de uma por aula) —
  // agrupa em memória depois, mesmo padrão batched usado no resto do app
  const { data: todosExercicios } = aulas.length
    ? await supabase
        .from("aula_exercicios")
        .select("aula_id, series, repeticoes, carga_inicial, ordem, exercicio:exercicios(nome)")
        .in(
          "aula_id",
          aulas.map((a) => a.id)
        )
        .order("ordem", { ascending: true })
    : { data: [] as LinhaAulaExercicio[] };

  const exerciciosPorAula = new Map<string, { nome: string; series: number; repeticoes: string; carga: number | null }[]>();
  for (const e of (todosExercicios ?? []) as unknown as LinhaAulaExercicio[]) {
    const lista = exerciciosPorAula.get(e.aula_id) ?? [];
    lista.push({ nome: e.exercicio?.nome ?? "Exercício", series: e.series, repeticoes: e.repeticoes, carga: e.carga_inicial });
    exerciciosPorAula.set(e.aula_id, lista);
  }

  const treinoAtual = aulas.map((a) => ({
    aulaNome: a.nome,
    exercicios: exerciciosPorAula.get(a.id) ?? [],
  }));

  return {
    aluno: aluno as Aluno,
    personal,
    evolucao,
    exerciciosEvoluindo: contexto.exerciciosEvoluindo,
    medidasRecentes: medidas ?? [],
    treinoAtual,
    pagamentosRecentes: pagamentos ?? [],
  };
}
