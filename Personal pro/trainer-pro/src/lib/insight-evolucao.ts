import type { ResumoEvolucao } from "@/lib/data/evolucao";

export interface InsightEvolucao {
  emoji: string;
  frase: string;
}

// Uma semana inteira (7 dias) sem nenhuma execução registrada é sinal claro
// de que sumiu — não depende de quantas vezes por semana o plano dele pede
// (mesmo quem treina só 1x/semana já teria treinado de novo dentro desse
// prazo na maioria dos casos, e é curto o bastante pra virar um alerta útil
// sem disparar cedo demais por causa de um dia de descanso a mais).
const LIMIAR_DIAS_SUMIU = 7;

/** Frase BEM curta + emoji — pensada pra um personal bater o olho e entender
 * na hora, tipo um status. Sem pronome de propósito (funciona igual na Home
 * do aluno e na Ficha/Histórico do personal, sem precisar de duas versões).
 *
 * Aderência JÁ tem card próprio — não vira insight (seria só repetir o
 * mesmo eixo com outras palavras). O insight cobre o que os cards não
 * dizem: se bateu a meta da semana, se sumiu, e a leitura da carga.
 *
 * "Sumiu" usa diasDesdeUltimoTreino (última execução, de QUALQUER ciclo),
 * não aderenciaPct — aderenciaPct só conta sessões das aulas do ciclo ATIVO,
 * então zera toda vez que o ciclo é renovado mesmo pra quem treinou ontem. */
export function gerarInsightEvolucao(
  resumo: ResumoEvolucao,
  opts: { semana?: { concluidas: number; meta: number } } = {}
): InsightEvolucao {
  const semana = opts.semana;

  if (semana && semana.meta > 0 && semana.concluidas >= semana.meta) {
    return { emoji: "🏆", frase: "Semana completa!" };
  }
  if (resumo.diasDesdeUltimoTreino === null) {
    return { emoji: "😴", frase: "Nunca treinou ainda" };
  }
  if (resumo.diasDesdeUltimoTreino >= LIMIAR_DIAS_SUMIU) {
    return { emoji: "😴", frase: `Sumiu — ${resumo.diasDesdeUltimoTreino} dias sem treinar` };
  }
  if (resumo.cargaTendencia === "positiva") {
    return { emoji: "🔥", frase: "Carga subindo bem" };
  }
  if (resumo.cargaTendencia === "negativa") {
    return { emoji: "📉", frase: "Carga em queda" };
  }
  return { emoji: "👍", frase: "Tudo em dia" };
}
