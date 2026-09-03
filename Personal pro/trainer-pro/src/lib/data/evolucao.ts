import "server-only";
import { createClient } from "@/lib/supabase/server";
import { diasDesde, type Tendencia } from "@/lib/status";

export interface ResumoEvolucao {
  pesoDeltaKg: number | null;
  pesoTendencia: Tendencia;
  cargaDeltaPct: number | null;
  cargaTendencia: Tendencia;
  aderenciaPct: number;
  aderenciaTendencia: Tendencia;
  /** Dias desde a última execução registrada, de QUALQUER ciclo/aula — null
   * se nunca treinou. Deliberadamente não depende do ciclo ativo: renovar o
   * ciclo cria aula_exercicios novos, então a aderência (que só conta sessão
   * das aulas do ciclo atual) zera na hora — usar aderenciaPct pra detectar
   * "sumiu" acusaria falso positivo em todo aluno que renovou o ciclo, por
   * mais que tenha treinado ontem. */
  diasDesdeUltimoTreino: number | null;
}

/** Resumo de evolução (topo da Ficha do aluno / Meu progresso): só 2-3 indicadores
 * com seta e cor, o detalhe fino fica atrás de "Ver tudo" nas telas de gráfico. */
export async function getResumoEvolucao(alunoId: string): Promise<ResumoEvolucao> {
  const supabase = await createClient();
  const trintaDiasAtras = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const sessentaDiasAtras = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);

  // as três consultas abaixo (peso, carga atual, carga anterior) e a busca do
  // ciclo ativo não dependem umas das outras — rodam em paralelo
  const [{ data: medidas }, { data: execAtual }, { data: execAnterior }, { data: ciclo }, { data: ultimaExecucao }] =
    await Promise.all([
      supabase
        .from("medidas")
        .select("peso, data")
        .eq("aluno_id", alunoId)
        .gte("data", trintaDiasAtras)
        .not("peso", "is", null)
        .order("data", { ascending: true }),
      supabase
        .from("execucoes")
        .select("carga")
        .eq("aluno_id", alunoId)
        .gte("data", trintaDiasAtras)
        .not("carga", "is", null),
      supabase
        .from("execucoes")
        .select("carga")
        .eq("aluno_id", alunoId)
        .gte("data", sessentaDiasAtras)
        .lt("data", trintaDiasAtras)
        .not("carga", "is", null),
      supabase.from("ciclos").select("id").eq("aluno_id", alunoId).eq("ativo", true).maybeSingle(),
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

  const media = (rows: { carga: number | null }[] | null) =>
    rows && rows.length ? rows.reduce((s, r) => s + Number(r.carga), 0) / rows.length : null;

  const mediaAtual = media(execAtual);
  const mediaAnterior = media(execAnterior);

  let cargaDeltaPct: number | null = null;
  if (mediaAtual !== null && mediaAnterior !== null && mediaAnterior > 0) {
    cargaDeltaPct = ((mediaAtual - mediaAnterior) / mediaAnterior) * 100;
  }
  const cargaTendencia: Tendencia =
    cargaDeltaPct === null ? "neutra" : cargaDeltaPct > 2 ? "positiva" : cargaDeltaPct < -2 ? "negativa" : "neutra";

  // Aderência: sessões de treino (aula x dia, de QUALQUER ciclo — não só o
  // ativo) numa janela vs. meta (aulas do ciclo ATUAL x semanas na janela).
  // A janela é os últimos 30 dias, OU desde a primeira execução já registrada
  // (de qualquer ciclo) se isso for mais recente — senão quem treina há 3
  // dias aparece com aderência baixíssima só por dividir pelo mês inteiro.
  //
  // De propósito NÃO usa ciclo.data_inicio pra isso (era a versão anterior
  // desse código): renovar o ciclo cria aula_exercicios novos com
  // data_inicio = hoje, e um aluno que treinou ontem só não teria NENHUMA
  // sessão dentro da janela — aderência cairia pra 0% a cada renovação,
  // mesmo pra quem nunca treinou menos. A meta ainda usa o ciclo atual (é o
  // plano vigente), mas as sessões contam independente de qual ciclo/aula
  // exata elas pertencem — é a mesma sessão de treino, só mudou o registro.
  let aderenciaPct = 0;
  if (ciclo) {
    const trintaDiasAtrasData = new Date(Date.now() - 30 * 86_400_000);

    const [{ data: aulas }, { data: primeiraExecucao }] = await Promise.all([
      supabase.from("aulas").select("id").eq("ciclo_id", ciclo.id),
      supabase.from("execucoes").select("data").eq("aluno_id", alunoId).order("data", { ascending: true }).limit(1).maybeSingle(),
    ]);

    const primeiraExecucaoData = primeiraExecucao ? new Date(primeiraExecucao.data) : null;
    const inicioJanela =
      primeiraExecucaoData && primeiraExecucaoData > trintaDiasAtrasData ? primeiraExecucaoData : trintaDiasAtrasData;
    const diasNaJanela = Math.max(1, Math.round((Date.now() - inicioJanela.getTime()) / 86_400_000));

    const { data: execs } = await supabase
      .from("execucoes")
      .select("data, aula_exercicios(aula_id)")
      .eq("aluno_id", alunoId)
      .gte("data", inicioJanela.toISOString());

    const metaSessoes = Math.max((aulas?.length ?? 0) * (diasNaJanela / 7), 1);
    const sessoesFeitas = new Set(
      ((execs ?? []) as unknown as { data: string; aula_exercicios: { aula_id: string } | null }[])
        .filter((e) => e.aula_exercicios?.aula_id)
        .map((e) => `${e.aula_exercicios!.aula_id}_${e.data.slice(0, 10)}`)
    );

    aderenciaPct = Math.min(100, Math.round((sessoesFeitas.size / metaSessoes) * 100));
  }
  const aderenciaTendencia: Tendencia =
    aderenciaPct >= 70 ? "positiva" : aderenciaPct >= 40 ? "neutra" : "negativa";

  return {
    pesoDeltaKg,
    pesoTendencia,
    cargaDeltaPct,
    cargaTendencia,
    aderenciaPct,
    aderenciaTendencia,
    diasDesdeUltimoTreino,
  };
}
