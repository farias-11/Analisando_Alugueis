import { requireAluno } from "@/lib/data/current-user";
import { getAulasDoCiclo, getCicloAtivo, aulaDoDia, getExerciciosDaAula } from "@/lib/data/aluno";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/nav/top-bar";
import { ScrollFit } from "@/components/scroll-fit";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Dumbbell, Moon, Play } from "lucide-react";
import Link from "next/link";

const NOMES_DIAS_ABREV = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const NOMES_DIAS_COMPLETO = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

// "A - Peito, ombro e tríceps" -> { titulo: "Treino A", subtitulo: "Peito, ombro e tríceps" }
// nomes que não seguem esse padrão (ex: personal usou outro estilo) caem no
// fallback (nome inteiro como título) em vez de quebrar a tela.
function partesDoNome(nome: string) {
  const match = nome.match(/^([A-Za-zÀ-ÿ0-9]+)\s*-\s*(.+)$/);
  if (!match) return { titulo: nome, subtitulo: null as string | null };
  return { titulo: `Treino ${match[1]}`, subtitulo: match[2] };
}

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
      <ScrollFit
        rolar={false}
        topo
        className="flex flex-col space-y-[var(--sf-gap)] p-[calc(var(--sf-pad)*0.75)] [&>*]:shrink-0"
      >
        <div>
          <p className="text-[length:var(--sf-label,0.75rem)] text-muted">Ciclo atual</p>
          <p className="text-base font-bold text-foreground">
            {ciclo.nome} · {ciclo.duracao_semanas} semanas
          </p>
        </div>

        {aulaHoje ? (
          <Link href={`/treino/${aulaHoje.id}`}>
            <Card className="relative flex flex-col overflow-hidden bg-primary p-[calc(var(--sf-pad)*0.9)] text-white">
              <Dumbbell size={26} strokeWidth={1.75} className="absolute right-5 top-5 text-white/35" />
              <p className="text-[length:var(--sf-label,0.75rem)] font-semibold uppercase tracking-wide text-white/80">
                Próximo treino
              </p>
              <p className="mt-1.5 max-w-[80%] text-[length:calc(var(--sf-title,1.5rem)*0.9)] font-extrabold leading-tight">
                {partesDoNome(aulaHoje.nome).subtitulo ?? aulaHoje.nome}
              </p>
              <p className="mt-1 text-sm text-white/80">
                {totalExerciciosHoje} exercícios
                {aulaHoje.duracao_estimada_min ? ` · ~${aulaHoje.duracao_estimada_min} min` : ""}
              </p>
              <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-center text-sm font-bold uppercase tracking-wide text-primary-dark">
                <Play size={14} className="fill-current" /> Começar treino
              </div>
            </Card>
          </Link>
        ) : (
          <Card className="relative flex flex-col bg-primary p-[calc(var(--sf-pad)*0.9)] text-white">
            <Dumbbell size={26} strokeWidth={1.75} className="absolute right-5 top-5 text-white/35" />
            <p className="text-[length:var(--sf-label,0.75rem)] font-semibold uppercase tracking-wide text-white/80">
              Próximo treino
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-base font-semibold">
              <Moon size={16} /> Hoje é dia de descanso.
            </p>
          </Card>
        )}

        <p className="text-[length:var(--sf-label,0.75rem)] font-semibold uppercase tracking-wide text-muted">
          Esta semana
        </p>

        <div className="space-y-4">
          {aulasComStatus.map(({ aula, totalExercicios, concluidaNaSemana }) => {
            const destaque = aulaHoje?.id === aula.id;
            const diaLabel =
              aula.dias_semana && aula.dias_semana.length > 0
                ? aula.dias_semana.length === 1
                  ? NOMES_DIAS_COMPLETO[aula.dias_semana[0]]
                  : aula.dias_semana
                      .slice()
                      .sort()
                      .map((d) => NOMES_DIAS_ABREV[d])
                      .join("/")
                : null;
            const { titulo, subtitulo } = partesDoNome(aula.nome);
            return (
              <Link key={aula.id} href={`/treino/${aula.id}`}>
                <Card
                  className={cn(
                    "flex items-center justify-between gap-3 border-l-4 p-5",
                    concluidaNaSemana
                      ? "border-l-success"
                      : destaque
                        ? "border-l-primary bg-primary-soft"
                        : "border-l-transparent"
                  )}
                >
                  <div>
                    <p className="text-base font-semibold">{titulo}</p>
                    <p className="text-sm text-muted">
                      {subtitulo ?? `${totalExercicios} exercícios`}
                    </p>
                  </div>
                  {concluidaNaSemana ? (
                    <span className="shrink-0 text-xs font-semibold text-success">Concluído</span>
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
