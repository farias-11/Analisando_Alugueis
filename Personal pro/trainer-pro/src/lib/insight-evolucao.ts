import type { ResumoEvolucao } from "@/lib/data/evolucao";

export interface InsightEvolucao {
  emoji: string;
  frase: string;
}

/** Frase BEM curta + emoji — pensada pra um personal bater o olho e entender
 * na hora, tipo um status. Sem pronome de propósito (funciona igual na Home
 * do aluno e na Ficha/Histórico do personal, sem precisar de duas versões).
 *
 * Aderência JÁ tem card próprio — não vira insight (seria só repetir o
 * mesmo eixo com outras palavras). O insight cobre o que os cards não
 * dizem: se bateu a meta da semana, se sumiu, e a leitura da carga. */
export function gerarInsightEvolucao(
  resumo: ResumoEvolucao,
  opts: { semana?: { concluidas: number; meta: number } } = {}
): InsightEvolucao {
  const semana = opts.semana;

  if (semana && semana.meta > 0 && semana.concluidas >= semana.meta) {
    return { emoji: "🏆", frase: "Semana completa!" };
  }
  if (resumo.aderenciaPct === 0) {
    return { emoji: "😴", frase: "Sumiu — 30 dias sem treinar" };
  }
  if (resumo.cargaTendencia === "positiva") {
    return { emoji: "🔥", frase: "Carga subindo bem" };
  }
  if (resumo.cargaTendencia === "negativa") {
    return { emoji: "📉", frase: "Carga em queda" };
  }
  return { emoji: "👍", frase: "Tudo em dia" };
}
