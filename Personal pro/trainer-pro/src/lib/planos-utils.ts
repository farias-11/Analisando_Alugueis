/** Próximo vencimento a partir da recorrência do plano (em meses) e, se
 * definido, do dia de pagamento combinado — em vez do antigo "+30 dias"
 * fixo pra todo mundo. Sem plano, mantém o comportamento anterior. */
export function calcularProximoVencimento(
  dataBaseISO: string,
  plano?: { recorrencia_meses: number; dia_pagamento: number | null } | null
): string {
  const base = new Date(dataBaseISO + "T00:00:00");

  if (!plano) {
    base.setDate(base.getDate() + 30);
    return base.toISOString().slice(0, 10);
  }

  base.setMonth(base.getMonth() + plano.recorrencia_meses);
  if (plano.dia_pagamento) {
    const ultimoDiaDoMes = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    base.setDate(Math.min(plano.dia_pagamento, ultimoDiaDoMes));
  }
  return base.toISOString().slice(0, 10);
}
