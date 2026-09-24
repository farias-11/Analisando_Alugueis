/** Agrupa uma lista de exercícios (de aula ou de template) em blocos,
 * juntando um item com `combina_proximo` e o próximo item da lista num
 * mesmo grupo (bi-set) — usado pelos editores do personal (ficha do aluno e
 * template) pra mostrar os dois exercícios do bi-set juntos, em vez de duas
 * linhas soltas que pareciam dois exercícios sem relação nenhuma. Mesma
 * regra de pareamento usada na lista de treino do aluno
 * (treino/[aulaId]/page.tsx), só que aqui é só visual — a ordem/edição de
 * cada linha continua individual. */
export function agruparBiset<T extends { combina_proximo: boolean }>(itens: T[]) {
  const grupos: { ex: T; exIndex: number; parceiro?: T; parceiroIndex?: number }[] = [];
  for (let i = 0; i < itens.length; i++) {
    if (i > 0 && itens[i - 1].combina_proximo) continue;
    const ex = itens[i];
    const parceiro = ex.combina_proximo ? itens[i + 1] : undefined;
    grupos.push({ ex, exIndex: i, parceiro, parceiroIndex: parceiro ? i + 1 : undefined });
  }
  return grupos;
}
