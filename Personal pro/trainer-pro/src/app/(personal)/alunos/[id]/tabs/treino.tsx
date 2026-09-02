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

      {aulasComExercicios.map(({ aula, exercicios }) => (
        <Card key={aula.id}>
          <CardTitle className="mb-2">{aula.nome}</CardTitle>
          <div className="space-y-1.5">
            {exercicios.map((ex, i) => (
              <div key={ex.id}>
                <div className="flex items-center justify-between text-sm">
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
                      : `${ex.series}x${ex.repeticoes}${ex.carga_inicial ? ` · ${ex.carga_inicial}kg` : ""} · ${ex.descanso_seg ?? "—"}s`}
                  </span>
                </div>
                {ex.combina_proximo && i < exercicios.length - 1 && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-primary">
                    <Link2 size={11} /> Bi-set com o próximo — faz os dois sem descanso entre eles
                  </p>
                )}
              </div>
            ))}
            {exercicios.length === 0 && (
              <p className="text-sm text-muted">Nenhum exercício adicionado ainda.</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
