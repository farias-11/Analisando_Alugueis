import { getAulasDoCiclo, getCicloAtivo, getExerciciosDaAula } from "@/lib/data/aluno";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDataBR, statusCiclo } from "@/lib/status";
import { Edit3 } from "lucide-react";

export async function TreinoTab({ alunoId }: { alunoId: string }) {
  const ciclo = await getCicloAtivo(alunoId);
  const aulas = ciclo ? await getAulasDoCiclo(ciclo.id) : [];
  const aulasComExercicios = await Promise.all(
    aulas.map(async (a) => ({ aula: a, exercicios: await getExerciciosDaAula(a.id) }))
  );

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
            {exercicios.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between text-sm">
                <span>{ex.exercicio.nome}</span>
                <span className="text-muted">
                  {ex.series}x{ex.repeticoes}
                  {ex.carga_inicial ? ` · ${ex.carga_inicial}kg` : ""}
                </span>
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
