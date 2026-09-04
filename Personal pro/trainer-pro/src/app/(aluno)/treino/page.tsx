import { requireAluno } from "@/lib/data/current-user";
import { getAulasDoCiclo, getCicloAtivo, aulaDoDia, getExerciciosDaAula } from "@/lib/data/aluno";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/nav/top-bar";
import { ScrollFit } from "@/components/scroll-fit";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Dumbbell, Moon } from "lucide-react";
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
  // janela de 7 dias (não só "hoje") — mesmo critério do "Meta semanal" da
  // Home (getAderenciaSemana): treino feito terça continua marcado até a
  // semana virar, não só no dia em que foi feito
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

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

  // uma única query pras execuções da semana de TODAS as aulas, em vez de uma
  // query de contagem por aula (evita N idas ao banco em série/paralelo)
  const todosAulaExercicioIds = exerciciosPorAula.flat().map((e) => e.id);
  const { data: execucoesSemana } = todosAulaExercicioIds.length
    ? await supabase
        .from("execucoes")
        .select("aula_exercicio_id")
        .eq("aluno_id", aluno.id)
        .in("aula_exercicio_id", todosAulaExercicioIds)
        .gte("data", seteDiasAtras.toISOString())
    : { data: [] as { aula_exercicio_id: string }[] };
  const aulaExercicioIdsFeitosNaSemana = new Set((execucoesSemana ?? []).map((e) => e.aula_exercicio_id));

  const aulasComStatus = aulas.map((aula, i) => {
    const exercicios = exerciciosPorAula[i];
    const concluidaNaSemana = exercicios.some((e) => aulaExercicioIdsFeitosNaSemana.has(e.id));
    return { aula, totalExercicios: exercicios.length, concluidaNaSemana };
  });
  const totalExerciciosHoje = aulaHoje ? exerciciosPorAula[aulas.findIndex((a) => a.id === aulaHoje.id)].length : 0;

  return (
    <div>
      <TopBar title="Treino" />
      <div className="space-y-4 p-4 pb-2 pr-14">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Ciclo atual · {ciclo.duracao_semanas} semanas
        </p>

        {aulaHoje ? (
          <Link href={`/treino/${aulaHoje.id}`}>
            <Card className="relative flex flex-col bg-primary p-6 text-white">
              <Dumbbell size={26} strokeWidth={1.75} className="absolute right-5 top-5 text-white/35" />
              <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Treino de hoje</p>
              <p className="mt-1.5 max-w-[85%] text-2xl font-extrabold leading-tight">{aulaHoje.nome}</p>
              <p className="mt-1 text-sm text-white/80">
                {totalExerciciosHoje} exercícios
                {aulaHoje.duracao_estimada_min ? ` · ~${aulaHoje.duracao_estimada_min} min` : ""}
              </p>
              <div className="mt-4 w-full rounded-2xl bg-white py-3.5 text-center text-sm font-semibold text-primary-dark">
                Começar treino
              </div>
            </Card>
          </Link>
        ) : (
          <Card className="flex items-center gap-2 bg-neutral-soft">
            <Moon size={16} className="text-muted" />
            <p className="text-sm text-muted">Hoje é dia de descanso.</p>
          </Card>
        )}

        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Esta semana</p>
      </div>

      <ScrollFit rolar={false} topo className="px-4 pb-4 pr-[3.25rem]">
        <div className="space-y-2">
          {aulasComStatus.map(({ aula, totalExercicios, concluidaNaSemana }) => {
            const destaque = aulaHoje?.id === aula.id;
            const diaLabel =
              aula.dias_semana && aula.dias_semana.length > 0
                ? aula.dias_semana
                    .slice()
                    .sort()
                    .map((d) => NOMES_DIAS[d])
                    .join("/")
                : null;
            return (
              <Link key={aula.id} href={`/treino/${aula.id}`}>
                <Card
                  className={cn(
                    "flex items-center justify-between gap-3",
                    destaque && "border-primary bg-primary-soft"
                  )}
                >
                  <div>
                    <p className="text-sm font-semibold">{aula.nome}</p>
                    <p className="text-xs text-muted">
                      {totalExercicios} exercícios
                      {aula.duracao_estimada_min ? ` · ~${aula.duracao_estimada_min} min` : ""}
                    </p>
                  </div>
                  {concluidaNaSemana ? (
                    <CheckCircle2 className="shrink-0 text-success" size={20} />
                  ) : destaque ? (
                    <Pill tone="primary" className="shrink-0">
                      Hoje
                    </Pill>
                  ) : diaLabel ? (
                    <span className="shrink-0 text-xs font-medium capitalize text-muted-2">{diaLabel}</span>
                  ) : null}
                </Card>
              </Link>
            );
          })}
        </div>
      </ScrollFit>
    </div>
  );
}
