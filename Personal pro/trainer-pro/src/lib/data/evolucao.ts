import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getStatusExerciciosAulaDesde } from "@/lib/data/aluno";
import { diasDesde, inicioDoDiaBrasil, type Tendencia } from "@/lib/status";

export interface ResumoEvolucao {
  pesoDeltaKg: number | null;
  pesoTendencia: Tendencia;
  /** Maior evolução de carga ENTRE OS EXERCÍCIOS do ciclo atual (primeira
   * carga registrada nesse exercício desde que o ciclo começou vs. a mais
   * recente) — não mais uma média cega de TODAS as cargas de todos os
   * exercícios misturadas. Ver comentário grande em getResumoEvolucao. */
  cargaDeltaPct: number | null;
  cargaTendencia: Tendencia;
  /** Nome do exercício dono do cargaDeltaPct acima — null se cargaDeltaPct
   * também for null (nenhum exercício com 2+ registros de carga no ciclo). */
  cargaExercicioNome: string | null;
  aderenciaPct: number;
  aderenciaTendencia: Tendencia;
  /** Dias desde a última execução registrada, de QUALQUER ciclo/aula — null
   * se nunca treinou. Deliberadamente não depende do ciclo ativo (diferente
   * de aderenciaPct, que agora É por ciclo de propósito — ver comentário lá):
   * um aluno que renovou o ciclo ontem e treinou ontem não pode aparecer como
   * "sumiu" só porque a aderência do ciclo novo ainda está no começo. São
   * duas perguntas diferentes — "sumiu?" (sempre olha pro treino mais
   * recente, não importa o ciclo) vs "está cumprindo o plano atual?"
   * (reseta a cada ciclo novo). */
  diasDesdeUltimoTreino: number | null;
}

/** Maior evolução de carga ENTRE OS EXERCÍCIOS de um ciclo — primeira carga
 * registrada em cada exercício desde que o ciclo começou vs. a mais recente
 * — e retorna a de MAIOR alta. Substitui a versão anterior (média de TODAS
 * as cargas de TODOS os exercícios num período fixo de 30 dias vs. 30-60
 * dias atrás): misturar carga de exercícios bem diferentes (ex: supino a
 * 40kg com rosca a 8kg) numa média só nunca fez muito sentido, e pior — pra
 * quem começou a treinar (ou renovou o ciclo) há menos de 60 dias, a janela
 * "30-60 dias atrás" simplesmente não tinha NENHUM registro, e o indicador
 * ficava pra sempre em "—" mesmo com vários treinos já feitos. */
async function getMelhorEvolucaoCiclo(
  alunoId: string,
  dataInicioCiclo: string
): Promise<{ exercicioNome: string; deltaPct: number } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("execucoes")
    .select("carga, data, aula_exercicios(exercicio_id, exercicios(nome))")
    .eq("aluno_id", alunoId)
    .gte("data", dataInicioCiclo)
    .not("carga", "is", null)
    .order("data", { ascending: true });

  if (!data || data.length === 0) return null;

  type Linha = {
    carga: number;
    aula_exercicios: { exercicio_id: string; exercicios: { nome: string } | null } | null;
  };
  const porExercicio = new Map<string, { nome: string; primeira: number; ultima: number }>();
  for (const row of data as unknown as Linha[]) {
    const exercicioId = row.aula_exercicios?.exercicio_id;
    const nome = row.aula_exercicios?.exercicios?.nome;
    if (!exercicioId || !nome) continue;
    const atual = porExercicio.get(exercicioId);
    // já vem ordenado por data ascendente — a primeira vez que aparece é a
    // carga mais antiga, e toda atualização de "ultima" depois é sempre mais
    // recente que a anterior
    if (!atual) porExercicio.set(exercicioId, { nome, primeira: row.carga, ultima: row.carga });
    else atual.ultima = row.carga;
  }

  let melhor: { exercicioNome: string; deltaPct: number } | null = null;
  for (const { nome, primeira, ultima } of porExercicio.values()) {
    if (primeira <= 0 || primeira === ultima) continue;
    const deltaPct = ((ultima - primeira) / primeira) * 100;
    if (!melhor || deltaPct > melhor.deltaPct) melhor = { exercicioNome: nome, deltaPct };
  }
  return melhor;
}

/** Resumo de evolução (topo da Ficha do aluno / Meu progresso): só 2-3 indicadores
 * com seta e cor, o detalhe fino fica atrás de "Ver tudo" nas telas de gráfico. */
export async function getResumoEvolucao(alunoId: string): Promise<ResumoEvolucao> {
  const supabase = await createClient();
  const trintaDiasAtras = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  // as consultas abaixo (peso, ciclo ativo, última execução) não dependem
  // umas das outras — rodam em paralelo. A evolução de carga (função acima)
  // só roda DEPOIS, porque precisa de ciclo.data_inicio.
  const [{ data: medidas }, { data: ciclo }, { data: ultimaExecucao }] = await Promise.all([
    supabase
      .from("medidas")
      .select("peso, data")
      .eq("aluno_id", alunoId)
      .gte("data", trintaDiasAtras)
      .not("peso", "is", null)
      .order("data", { ascending: true }),
    supabase.from("ciclos").select("id, data_inicio").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle(),
    supabase
      .from("execucoes")
      .select("data")
      .eq("aluno_id", alunoId)
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const diasDesdeUltimoTreino = ultimaExecucao ? diasDesde(ultimaExecucao.data) : null;

  let pesoDeltaKg: number | null = null;
  if (medidas && medidas.length >= 2) {
    pesoDeltaKg = Number(medidas[medidas.length - 1].peso) - Number(medidas[0].peso);
  }
  const pesoTendencia: Tendencia =
    pesoDeltaKg === null ? "neutra" : pesoDeltaKg < -0.2 ? "positiva" : pesoDeltaKg > 0.2 ? "negativa" : "neutra";

  const melhorEvolucao = ciclo ? await getMelhorEvolucaoCiclo(alunoId, ciclo.data_inicio) : null;
  const cargaDeltaPct = melhorEvolucao?.deltaPct ?? null;
  const cargaExercicioNome = melhorEvolucao?.exercicioNome ?? null;
  const cargaTendencia: Tendencia =
    cargaDeltaPct === null ? "neutra" : cargaDeltaPct > 2 ? "positiva" : cargaDeltaPct < -2 ? "negativa" : "neutra";

  // Aderência: sessões de treino (aula x dia) completas DENTRO DO CICLO ATUAL
  // vs. meta (aulas do ciclo x semanas decorridas desde que ele começou).
  // De propósito USA ciclo.data_inicio como início da janela — pedido
  // explícito do produto: "trocou o ciclo, trocou a aderência". Renovar o
  // ciclo agora reseta a aderência de verdade (começa do 0%, sobe conforme o
  // aluno treina o plano NOVO) — isso é intencional, não bug. Ver
  // diasDesdeUltimoTreino acima pra "sumiu?", que é a pergunta que continua
  // cross-ciclo.
  let aderenciaPct = 0;
  if (ciclo) {
    const [anoCiclo, mesCiclo, diaCiclo] = ciclo.data_inicio.split("-").map(Number);
    // mesma conversão de inicioDoDiaBrasil (meia-noite em SP = 03:00 UTC) —
    // ciclo.data_inicio é só a data (YYYY-MM-DD), sem horário/fuso próprio.
    const inicioJanela = new Date(Date.UTC(anoCiclo, mesCiclo - 1, diaCiclo, 3, 0, 0, 0));
    const diasNaJanela = Math.max(1, Math.round((Date.now() - inicioJanela.getTime()) / 86_400_000));

    const { data: aulas } = await supabase.from("aulas").select("id").eq("ciclo_id", ciclo.id);

    const { data: execs } = await supabase
      .from("execucoes")
      .select("data, aula_exercicios(aula_id)")
      .eq("aluno_id", alunoId)
      .gte("data", inicioJanela.toISOString());

    // "sessão feita" (aula x dia) só conta de verdade quando o treino
    // INTEIRO daquele dia foi concluído — não só ter tocado em algum
    // exercício. Bug real já visto aqui: 1 série de 1 exercício já bastava
    // pra contar uma sessão inteira, inflando a aderência (mesma classe do
    // bug já corrigido na meta semanal). As linhas de execuções só servem
    // aqui pra achar os pares (aula, dia) CANDIDATOS a conferir — a
    // contagem de verdade vem de getStatusExerciciosAulaDesde, checando
    // cada dia isoladamente ([meia-noite Brasília desse dia, meia-noite do
    // dia seguinte)). Dia calculado via inicioDoDiaBrasil (não data.slice(0,10)
    // cru, que é UTC) — um treino feito às 22h de SP já é 01h em UTC do dia
    // seguinte, e fatiar por UTC fragmentava uma sessão só em dois dias,
    // fazendo nenhum dos dois bater o treino inteiro.
    const paresCandidatos = new Map<string, { aulaId: string; diaInicio: Date }>();
    for (const e of (execs ?? []) as unknown as { data: string; aula_exercicios: { aula_id: string } | null }[]) {
      const aulaId = e.aula_exercicios?.aula_id;
      if (!aulaId) continue;
      const diaInicio = inicioDoDiaBrasil(new Date(e.data));
      paresCandidatos.set(`${aulaId}_${diaInicio.getTime()}`, { aulaId, diaInicio });
    }
    const statusPorPar = await Promise.all(
      Array.from(paresCandidatos.values()).map(({ aulaId, diaInicio }) => {
        const diaFim = new Date(diaInicio.getTime() + 86_400_000);
        return getStatusExerciciosAulaDesde(alunoId, aulaId, diaInicio, diaFim);
      })
    );

    const metaSessoes = Math.max((aulas?.length ?? 0) * (diasNaJanela / 7), 1);
    const sessoesFeitas = statusPorPar.filter((s) => s.todosConcluidos).length;

    aderenciaPct = Math.min(100, Math.round((sessoesFeitas / metaSessoes) * 100));
  }
  const aderenciaTendencia: Tendencia =
    aderenciaPct >= 70 ? "positiva" : aderenciaPct >= 40 ? "neutra" : "negativa";

  return {
    pesoDeltaKg,
    pesoTendencia,
    cargaDeltaPct,
    cargaTendencia,
    cargaExercicioNome,
    aderenciaPct,
    aderenciaTendencia,
    diasDesdeUltimoTreino,
  };
}
