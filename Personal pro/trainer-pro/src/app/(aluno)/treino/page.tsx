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
  const supabase = await createClient();
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  // aulaDoDia (própria query interna) e os exercícios de cada aula não
  // dependem um do outro — rodam em paralelo. Exercícios de todas as aulas
  // numa query só (.in) em vez de uma query por aula.
  const aulaIds = aulas.map((a) => a.id);
  const [aulaHoje, { data: exerciciosData }] = await Promise.all([
    aulaDoDia(aluno.id, aulas),
    aulaIds.length
      ? supabase.from("aula_exercicios").select("*, exercicio:exercicios(*)").in("aula_id", aulaIds).order("ordem", { ascending: true })
      : Promise.resolve({ data: [] as Awaited<ReturnType<typeof getExerciciosDaAula>> }),
  ]);
  const exerciciosPorAulaId = new Map<string, typeof exerciciosData>();
  for (const ex of exerciciosData ?? []) {
    const lista = exerciciosPorAulaId.get(ex.aula_id) ?? [];
    lista.push(ex);
    exerciciosPorAulaId.set(ex.aula_id, lista);
  }
  const exerciciosPorAula = aulas.map((aula) => exerciciosPorAulaId.get(aula.id) ?? []);

  // uma única query pras execuções de hoje de TODAS as aulas, em vez de uma
  // query de contagem por aula (evita N idas ao banco em série/paralelo)
  const todosAulaExercicioIds = exerciciosPorAula.flat().map((e) => e.id);
  const { data: execucoesHoje } = todosAulaExercicioIds.length
    ? await supabase
        .from("execucoes")
        .select("aula_exercicio_id")
        .eq("aluno_id", aluno.id)
        .in("aula_exercicio_id", todosAulaExercicioIds)
        .gte("data", hojeInicio.toISOString())
    : { data: [] as { aula_exercicio_id: string }[] };
  const aulaExercicioIdsFeitosHoje = new Set((execucoesHoje ?? []).map((e) => e.aula_exercicio_id));

  const aulasComStatus = aulas.map((aula, i) => {
    const exercicios = exerciciosPorAula[i];
    const concluidaHoje = exercicios.some((e) => aulaExercicioIdsFeitosHoje.has(e.id));
    return { aula, totalExercicios: exercicios.length, concluidaHoje };
  });

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
