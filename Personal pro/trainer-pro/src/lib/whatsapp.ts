/** Monta o link direto wa.me com a mensagem já preenchida — sem API paga. */
export function buildWhatsappLink(numero: string, mensagem: string) {
  const numeroLimpo = numero.replace(/\D/g, "");
  return `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
}

export function mensagemTicketDor(params: {
  alunoNome: string;
  aulaNome?: string | null;
  exercicioNome: string;
  descricao: string;
}) {
  const { alunoNome, aulaNome, exercicioNome, descricao } = params;
  const linhas = [
    `Relato de dor/desconforto — ${alunoNome}`,
    aulaNome ? `Aula: ${aulaNome}` : null,
    `Exercício: ${exercicioNome}`,
    "",
    descricao,
  ].filter(Boolean);
  return linhas.join("\n");
}
