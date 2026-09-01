import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Tendencia } from "@/lib/status";

export interface ResumoEvolucao {
  pesoDeltaKg: number | null;
  pesoTendencia: Tendencia;
  cargaDeltaPct: number | null;
  cargaTendencia: Tendencia;
  aderenciaPct: number;
  aderenciaTendencia: Tendencia;
}

/** Resumo de evolução (topo da Ficha do aluno / Meu progresso): só 2-3 indicadores
 * com seta e cor, o detalhe fino fica atrás de "Ver tudo" nas telas de gráfico. */
export async function getResumoEvolucao(alunoId: string): Promise<ResumoEvolucao> {
  const supabase = await createClient();
  const trintaDiasAtras = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const sessentaDiasAtras = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);

  // Peso: primeira e última medida dos últimos 30 dias
  const { data: medidas } = await supabase
    .from("medidas")
    .select("peso, data")
    .eq("aluno_id", alunoId)
    .gte("data", trintaDiasAtras)
    .not("peso", "is", null)
    .order("data", { ascending: true });

  let pesoDeltaKg: number | null = null;
  if (medidas && medidas.length >= 2) {
    pesoDeltaKg = Number(medidas[medidas.length - 1].peso) - Number(medidas[0].peso);
  }
  const pesoTendencia: Tendencia =
    pesoDeltaKg === null ? "neutra" : pesoDeltaKg < -0.2 ? "positiva" : pesoDeltaKg > 0.2 ? "negativa" : "neutra";

  // Carga média: execuções dos últimos 30 dias vs. 30 dias anteriores
  const { data: execAtual } = await supabase
    .from("execucoes")
    .select("carga")
    .eq("aluno_id", alunoId)
    .gte("data", trintaDiasAtras)
    .not("carga", "is", null);

  const { data: execAnterior } = await supabase
    .from("execucoes")
    .select("carga")
    .eq("aluno_id", alunoId)
    .gte("data", sessentaDiasAtras)
    .lt("data", trintaDiasAtras)
    .not("carga", "is", null);

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

  // Aderência: sessões de treino (aula x dia) nos últimos 30 dias vs. meta
  // (aulas por semana do ciclo x ~4.3 semanas). Conta sessões, não só quais
  // aulas já foram feitas ao menos uma vez — senão o teto ficaria em ~23%.
  const { data: ciclo } = await supabase
    .from("ciclos")
    .select("id")
    .eq("aluno_id", alunoId)
    .eq("ativo", true)
    .maybeSingle();

  let aderenciaPct = 0;
  if (ciclo) {
    const { data: aulas } = await supabase.from("aulas").select("id").eq("ciclo_id", ciclo.id);
    const metaSessoes = Math.max((aulas?.length ?? 0) * 4.3, 1);

    const { data: execs } = await supabase
      .from("execucoes")
      .select("data, aula_exercicios(aula_id)")
      .eq("aluno_id", alunoId)
      .gte("data", trintaDiasAtras);

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
  };
}
