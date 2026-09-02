import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChartPoint } from "@/components/charts/simple-line-chart";

function rotuloCurto(iso: string) {
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export async function getGraficoPeso(alunoId: string): Promise<ChartPoint[]> {
  const supabase = await createClient();
  // desc + limit pega os 30 mais RECENTES (não os 30 primeiros da vida do
  // aluno) — depois reordena pra ascendente, que é o que o gráfico espera
  const { data } = await supabase
    .from("medidas")
    .select("data, peso")
    .eq("aluno_id", alunoId)
    .not("peso", "is", null)
    .order("data", { ascending: false })
    .limit(30);

  return (data ?? [])
    .slice()
    .reverse()
    .map((m) => ({ data: rotuloCurto(m.data), valor: Number(m.peso) }));
}

export async function getGraficoBioimpedancia(
  alunoId: string
): Promise<{ peso: ChartPoint[]; percentualGordura: ChartPoint[] }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bioimpedancias")
    .select("data, peso, percentual_gordura")
    .eq("aluno_id", alunoId)
    .order("data", { ascending: false })
    .limit(30);

  const recentesAscendente = (data ?? []).slice().reverse();

  return {
    peso: recentesAscendente
      .filter((b) => b.peso !== null)
      .map((b) => ({ data: rotuloCurto(b.data), valor: Number(b.peso) })),
    percentualGordura: recentesAscendente
      .filter((b) => b.percentual_gordura !== null)
      .map((b) => ({ data: rotuloCurto(b.data), valor: Number(b.percentual_gordura) })),
  };
}

/** Evolução de carga do exercício com mais registros — mostrado como referência
 * principal em "Meu progresso" (o detalhe por exercício fica na Ficha do aluno).
 * Agrega por dia (maior carga do dia): sem isso, um aluno que treina bastante
 * gera um ponto por série e o gráfico vira uma nuvem ilegível. */
export async function getGraficoCargaPrincipal(
  alunoId: string
): Promise<{ exercicioNome: string; pontos: ChartPoint[] } | null> {
  const supabase = await createClient();
  const noventaDiasAtras = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const { data: execucoes } = await supabase
    .from("execucoes")
    .select("data, carga, aula_exercicios(exercicio_id, exercicios(nome))")
    .eq("aluno_id", alunoId)
    .not("carga", "is", null)
    .gte("data", noventaDiasAtras)
    .order("data", { ascending: true });

  if (!execucoes || execucoes.length === 0) return null;

  type Linha = {
    data: string;
    carga: number;
    aula_exercicios: { exercicio_id: string; exercicios: { nome: string } | null } | null;
  };
  const linhas = execucoes as unknown as Linha[];

  // 1) descobre o exercício com mais séries registradas
  const contagemPorExercicio = new Map<string, { nome: string; total: number }>();
  for (const linha of linhas) {
    const exId = linha.aula_exercicios?.exercicio_id;
    const nome = linha.aula_exercicios?.exercicios?.nome;
    if (!exId || !nome) continue;
    const atual = contagemPorExercicio.get(exId) ?? { nome, total: 0 };
    atual.total += 1;
    contagemPorExercicio.set(exId, atual);
  }
  let exIdEscolhido: string | null = null;
  let melhorInfo: { nome: string; total: number } | null = null;
  for (const [exId, info] of contagemPorExercicio) {
    if (!melhorInfo || info.total > melhorInfo.total) {
      melhorInfo = info;
      exIdEscolhido = exId;
    }
  }
  if (!exIdEscolhido || !melhorInfo) return null;

  // 2) agrega por dia (maior carga do dia) só para esse exercício
  const maiorCargaPorDia = new Map<string, number>();
  for (const linha of linhas) {
    if (linha.aula_exercicios?.exercicio_id !== exIdEscolhido) continue;
    const dia = linha.data.slice(0, 10);
    const atual = maiorCargaPorDia.get(dia) ?? 0;
    if (linha.carga > atual) maiorCargaPorDia.set(dia, linha.carga);
  }

  const pontos: ChartPoint[] = Array.from(maiorCargaPorDia.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([dia, carga]) => ({ data: rotuloCurto(dia), valor: carga }));

  return { exercicioNome: melhorInfo.nome, pontos };
}
