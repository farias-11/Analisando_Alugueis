import { requireAluno } from "@/lib/data/current-user";
import { getAulasDoCiclo, getCicloAtivo, aulaDoDia, getExerciciosDaAula } from "@/lib/data/aluno";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/nav/top-bar";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, Circle, Moon } from "lucide-react";
import Link from "next/link";

const NOMES_DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export default async function TreinoDoDiaPage() {
  const { aluno } = await requireAluno();
  const ciclo = await getCicloAtivo(aluno.id);

  if (!ciclo) {
    return (
      <div>
        <TopBar title="Meu treino" />
        <div className="p-4">
          <Card>
            <p className="text-sm text-muted">
              Você ainda não tem um ciclo de treino ativo. Fale com seu personal.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  const aulas = await getAulasDoCiclo(ciclo.id);
  const aulaHoje = await aulaDoDia(aluno.id, aulas);
  const supabase = await createClient();
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const aulasComStatus = await Promise.all(
    aulas.map(async (aula) => {
      const exercicios = await getExerciciosDaAula(aula.id);
      const aulaExercicioIds = exercicios.map((e) => e.id);
      let concluidaHoje = false;
      if (aulaExercicioIds.length > 0) {
        const { count } = await supabase
          .from("execucoes")
          .select("id", { count: "exact", head: true })
          .eq("aluno_id", aluno.id)
          .in("aula_exercicio_id", aulaExercicioIds)
          .gte("data", hojeInicio.toISOString());
        concluidaHoje = (count ?? 0) > 0;
      }
      return { aula, totalExercicios: exercicios.length, concluidaHoje };
    })
  );

  return (
    <div>
      <TopBar title="Meu treino" />
      <div className="space-y-3 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Ciclo atual · {ciclo.duracao_semanas} semanas
        </p>

        {!aulaHoje && (
          <Card className="flex items-center gap-2 bg-neutral-soft">
            <Moon size={16} className="text-muted" />
            <p className="text-sm text-muted">Hoje é dia de descanso.</p>
          </Card>
        )}

        {aulasComStatus.map(({ aula, totalExercicios, concluidaHoje }) => {
          const destaque = aulaHoje?.id === aula.id;
          return (
            <Link key={aula.id} href={`/treino/${aula.id}`}>
              <Card
                className={destaque ? "border-2 border-primary" : undefined}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <CardTitle>{aula.nome}</CardTitle>
                      {destaque ? <Pill tone="primary">Hoje</Pill> : null}
                    </div>
                    <CardSubtitle>
                      {totalExercicios} exercícios
                      {aula.duracao_estimada_min ? ` · ~${aula.duracao_estimada_min} min` : ""}
                      {aula.dias_semana && aula.dias_semana.length > 0
                        ? ` · ${aula.dias_semana
                            .slice()
                            .sort()
                            .map((d) => NOMES_DIAS[d])
                            .join("/")}`
                        : ""}
                    </CardSubtitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {concluidaHoje ? (
                      <CheckCircle2 className="text-success" size={20} />
                    ) : (
                      <Circle className="text-muted-2" size={20} />
                    )}
                    <ChevronRight className="text-muted-2" size={18} />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
