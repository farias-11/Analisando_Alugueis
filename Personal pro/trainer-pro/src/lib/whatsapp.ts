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

export function mensagemConvite(params: { alunoNome: string; personalNome: string; link: string }) {
  const { alunoNome, personalNome, link } = params;
  return `Oi ${alunoNome.split(" ")[0]}! Aqui é o ${personalNome}. Criei seu acesso ao Trainer Pro pra gente acompanhar seu treino por lá. É só abrir esse link e criar sua senha:\n${link}`;
}

export function mensagemCobranca(params: { alunoNome: string; valor: number | null; vencimento: string | null }) {
  const { alunoNome, valor, vencimento } = params;
  const valorTexto = valor ? `R$ ${Number(valor).toFixed(2).replace(".", ",")}` : "sua mensalidade";
  const vencimentoTexto = vencimento
    ? new Date(vencimento + "T00:00:00").toLocaleDateString("pt-BR")
    : null;
  return `Oi ${alunoNome.split(" ")[0]}! Passando pra lembrar que ${valorTexto}${vencimentoTexto ? ` (venc. ${vencimentoTexto})` : ""} está em aberto. Qualquer coisa me chama por aqui 🙂`;
}
