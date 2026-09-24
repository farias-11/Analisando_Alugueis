import { getAulasDoCiclo, getCicloAtivo, getExerciciosDaAula } from "@/lib/data/aluno";
import { createClient } from "@/lib/supabase/server";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDataBR, statusCiclo } from "@/lib/status";
import { Edit3, Flame, GitBranch, Link2 } from "lucide-react";

export async function TreinoTab({ alunoId }: { alunoId: string }) {
  const ciclo = await getCicloAtivo(alunoId);
  const aulas = ciclo ? await getAulasDoCiclo(ciclo.id) : [];
  const aulasComExercicios = await Promise.all(
    aulas.map(async (a) => ({ aula: a, exercicios: await getExerciciosDaAula(a.id) }))
  );

  let origem: string | null = null;
  if (ciclo?.origem_template_id || ciclo?.origem_aluno_id) {
    const supabase = await createClient();
    if (ciclo.origem_template_id) {
      const { data } = await supabase
        .from("templates")
        .select("nome")
        .eq("id", ciclo.origem_template_id)
        .maybeSingle();
      if (data) origem = `Aplicado do template "${data.nome}"`;
    } else if (ciclo.origem_aluno_id) {
      const { data } = await supabase
        .from("alunos")
        .select("nome")
        .eq("id", ciclo.origem_aluno_id)
        .maybeSingle();
      if (data) origem = `Duplicado do treino de ${data.nome}`;
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{ciclo ? ciclo.nome : "Sem ciclo ativo"}</CardTitle>
            {ciclo && (
              <CardSubtitle>
                {ciclo.duracao_semanas} semanas · término {formatDataBR(ciclo.data_fim)}
              </CardSubtitle>
            )}
            {origem && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <GitBranch size={12} /> {origem}
              </p>
            )}
          </div>
          {ciclo && <Badge status={statusCiclo(ciclo.data_fim)} />}
        </div>
        <ButtonLink href={`/alunos/${alunoId}/treino`} size="sm" className="mt-3 gap-1.5">
          <Edit3 size={14} /> {ciclo ? "Editar treino" : "Criar treino"}
        </ButtonLink>
      </Card>

      {aulasComExercicios.map(({ aula, exercicios }) => {
        // aquecimento + continuação do mesmo exercício são 2 linhas no banco
        // (contagem de série diferente), mas é 1 fluxo só na execução — junta
        // as duas aqui pra não aparecer o mesmo exercício duas vezes seguidas
        const itens: { principal: (typeof exercicios)[number]; continuacao?: (typeof exercicios)[number] }[] = [];
        for (let i = 0; i < exercicios.length; i++) {
          const atual = exercicios[i];
          const anterior = exercicios[i - 1];
          if (anterior?.eh_aquecimento && anterior.exercicio_id === atual.exercicio_id) continue;
          const proximo = exercicios[i + 1];
          const temContinuacao = atual.eh_aquecimento && proximo && proximo.exercicio_id === atual.exercicio_id;
          itens.push({ principal: atual, continuacao: temContinuacao ? proximo : undefined });
        }

        function linha({ principal: ex, continuacao }: (typeof itens)[number]) {
          return (
            <div key={ex.id} className="flex items-center justify-between text-sm">
              <span className="flex flex-wrap items-center gap-1.5">
                {ex.exercicio.nome}
                {ex.eh_aquecimento && (
                  <span className="flex items-center gap-0.5 rounded-pill bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning">
                    <Flame size={10} /> Aquecimento
                  </span>
                )}
              </span>
              <span className="text-muted">
                {ex.tipo === "cardio"
                  ? `${ex.duracao_min ?? "—"}min${ex.intensidade ? ` · ${ex.intensidade}` : ""}`
                  : continuacao
                    ? `${continuacao.series}x${continuacao.repeticoes} +${ex.series} aquec. · ${continuacao.descanso_seg ?? "—"}s`
                    : `${ex.series}x${ex.repeticoes}${ex.carga_inicial ? ` · ${ex.carga_inicial}kg` : ""} · ${ex.descanso_seg ?? "—"}s`}
              </span>
            </div>
          );
        }

        // mesma regra de pareamento de treinos.ts/agrupar-biset.ts — um item
        // com combina_proximo forma bi-set com o próximo item de "itens"
        // (aquecimento já foi colapsado acima, então os índices aqui já são
        // só exercícios "de verdade").
        const grupos: { item: (typeof itens)[number]; parceiro?: (typeof itens)[number] }[] = [];
        for (let i = 0; i < itens.length; i++) {
          if (i > 0 && itens[i - 1].principal.combina_proximo) continue;
          const item = itens[i];
          grupos.push({ item, parceiro: item.principal.combina_proximo ? itens[i + 1] : undefined });
        }

        return (
          <Card key={aula.id}>
            <CardTitle className="mb-2">{aula.nome}</CardTitle>
            <div className="space-y-1.5">
              {grupos.map(({ item, parceiro }) =>
                parceiro ? (
                  <div
                    key={item.principal.id}
                    className="space-y-1 rounded-lg border border-primary/30 bg-primary-soft/20 p-1.5"
                  >
                    <p className="flex items-center gap-1 px-1 text-[11px] font-semibold text-primary-dark">
                      <Link2 size={11} /> Bi-set
                    </p>
                    {linha(item)}
                    {linha(parceiro)}
                  </div>
                ) : (
                  linha(item)
                )
              )}
              {itens.length === 0 && (
                <p className="text-sm text-muted">Nenhum exercício adicionado ainda.</p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
