import type { ResumoEvolucao } from "@/lib/data/evolucao";

export interface InsightEvolucao {
  emoji: string;
  frase: string;
}

/** Frase curta + emoji resumindo o estado geral do aluno, usado tanto na
 * Home do aluno (2ª pessoa) quanto na Ficha/Histórico do personal (3ª
 * pessoa) — mesma lógica de prioridade nos dois lugares, só muda o texto.
 *
 * De propósito NÃO repete os números que já aparecem nos cards de peso/carga/
 * aderência logo acima (isso só duplicaria a mesma informação) — a frase
 * tenta interpretar o que aqueles números significam, não redizer o valor. */
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
  if (resumo.cargaTendencia === "positiva") {
    return {
      emoji: "🔥",
      frase: voce ? "Sua carga está subindo — evoluindo direitinho!" : "Carga em alta — evoluindo bem.",
    };
  }
  if (resumo.cargaTendencia === "negativa") {
    return {
      emoji: "📉",
      frase: voce
        ? "Sua carga média caiu ultimamente — pode ser fadiga ou hora de ajustar o treino."
        : "Carga média em queda — vale conversar sobre carga ou descanso.",
    };
  }
  if (resumo.aderenciaTendencia === "negativa") {
    return {
      emoji: "⚠️",
      frase: voce ? "Você tá treinando menos que o planejado — bora recuperar o ritmo?" : "Treinando menos que o planejado ultimamente.",
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
