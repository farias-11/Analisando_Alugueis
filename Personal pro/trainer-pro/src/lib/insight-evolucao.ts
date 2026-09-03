import type { ResumoEvolucao } from "@/lib/data/evolucao";

export interface InsightEvolucao {
  emoji: string;
  frase: string;
}

/** Frase curta + emoji resumindo o estado geral do aluno, usado tanto na
 * Home do aluno (2ª pessoa) quanto na Ficha/Histórico do personal (3ª
 * pessoa) — mesma lógica de prioridade nos dois lugares, só muda o texto. */
export function gerarInsightEvolucao(
  resumo: ResumoEvolucao,
  opts: { pessoa: "voce" | "ele"; semana?: { concluidas: number; meta: number } }
): InsightEvolucao {
  const voce = opts.pessoa === "voce";
  const semana = opts.semana;

  if (semana && semana.meta > 0 && semana.concluidas >= semana.meta) {
    return {
      emoji: "🏆",
      frase: voce ? "Você treinou a semana completa! Mandou muito bem." : "Treinou a semana completa.",
    };
  }
  if (resumo.aderenciaPct === 0) {
    return {
      emoji: "😴",
      frase: voce ? "Nenhum treino registrado nos últimos 30 dias — bora voltar?" : "Sem treinos nos últimos 30 dias.",
    };
  }
  if (resumo.cargaTendencia === "positiva" && resumo.cargaDeltaPct !== null) {
    const pct = Math.round(resumo.cargaDeltaPct);
    return {
      emoji: "🔥",
      frase: voce
        ? `Sua carga média subiu ${pct}% no último mês — evoluindo direitinho!`
        : `Carga média subiu ${pct}% no último mês.`,
    };
  }
  if (resumo.cargaTendencia === "negativa" && resumo.cargaDeltaPct !== null) {
    const pct = Math.abs(Math.round(resumo.cargaDeltaPct));
    return {
      emoji: "📉",
      frase: voce ? `Sua carga média caiu ${pct}% no último mês.` : `Carga média caiu ${pct}% no último mês.`,
    };
  }
  if (resumo.aderenciaTendencia === "negativa") {
    return {
      emoji: "⚠️",
      frase: voce
        ? `Só ${resumo.aderenciaPct}% dos treinos previstos rolaram no último mês — dá pra melhorar.`
        : `Aderência baixa: ${resumo.aderenciaPct}% do previsto no último mês.`,
    };
  }
  if (resumo.aderenciaTendencia === "positiva") {
    return {
      emoji: "💪",
      frase: voce ? "Aderência ótima nas últimas semanas — continue assim!" : "Aderência ótima nas últimas semanas.",
    };
  }
  return { emoji: "👍", frase: voce ? "Tudo estável por aqui." : "Estado estável." };
}
