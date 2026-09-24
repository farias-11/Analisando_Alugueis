import { requireAluno } from "@/lib/data/current-user";
import {
  getAulasDoCiclo,
  getCicloAtivo,
  aulaDoDia,
  getExerciciosDaAula,
  getStatusExerciciosAulaDesde,
} from "@/lib/data/aluno";
import { createClient } from "@/lib/supabase/server";
import { inicioDaSemanaAtualBrasil } from "@/lib/status";
import { TopBar } from "@/components/nav/top-bar";
import { ScrollFit } from "@/components/scroll-fit";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, Dumbbell, Moon, Play } from "lucide-react";
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
// "Treino 1 C - Costas e bíceps" -> { titulo: "Treino 1 C", subtitulo: "Costas e bíceps" } —
// prefixo pode ter espaço (o personal as vezes já escreve "Treino X"), só não
// duplica "Treino" quando ele já vem no prefixo. Nomes sem " - " nenhum (ex:
// "Costas") caem no fallback (nome inteiro como título) em vez de quebrar a
// tela.
function partesDoNome(nome: string) {
  const match = nome.match(/^(.+?)\s-\s(.+)$/);
  if (!match) return { titulo: nome, subtitulo: null as string | null };
  const prefixo = match[1].trim();
  const titulo = /^treino\b/i.test(prefixo) ? prefixo : `Treino ${prefixo}`;
  return { titulo, subtitulo: match[2].trim() };
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
  // semana civil atual (domingo até agora, horário de Brasília) — mesmo
  // critério do "Meta semanal" da Home (getAderenciaSemana): treino feito
  // terça continua marcado até a semana virar, não "últimos 7 dias" (isso
  // era um bug real: treino de quinta/sexta ainda aparecia "feito essa
  // semana" na segunda seguinte, mesmo a semana já tendo virado no domingo).
  const inicioSemana = inicioDaSemanaAtualBrasil();

  // aulaDoDia (própria query interna), os exercícios de cada aula e o status
  // de conclusão da semana não dependem um do outro — rodam em paralelo.
  // Exercícios de todas as aulas numa query só (.in) em vez de uma por aula;
  // o status de conclusão usa getStatusExerciciosAulaDesde (mesma função da
  // Home/getAderenciaSemana) pra "concluída" significar o TREINO INTEIRO
  // feito essa semana, não só ter tocado em algum exercício — bug real já
  // visto aqui: um card aparecia "Concluído" com só 1 série de 1 exercício
  // registrada.
  const aulaIds = aulas.map((a) => a.id);
  const [aulaHoje, { data: exerciciosData }, statusPorAula] = await Promise.all([
    aulaDoDia(aluno.id, aulas),
    aulaIds.length
      ? supabase.from("aula_exercicios").select("*, exercicio:exercicios(*)").in("aula_id", aulaIds).order("ordem", { ascending: true })
      : Promise.resolve({ data: [] as Awaited<ReturnType<typeof getExerciciosDaAula>> }),
    Promise.all(aulas.map((a) => getStatusExerciciosAulaDesde(aluno.id, a.id, inicioSemana))),
  ]);
  const exerciciosPorAulaId = new Map<string, typeof exerciciosData>();
  for (const ex of exerciciosData ?? []) {
    const lista = exerciciosPorAulaId.get(ex.aula_id) ?? [];
    lista.push(ex);
    exerciciosPorAulaId.set(ex.aula_id, lista);
  }
  const exerciciosPorAula = aulas.map((aula) => exerciciosPorAulaId.get(aula.id) ?? []);

  const aulasComStatus = aulas.map((aula, i) => {
    const exercicios = exerciciosPorAula[i];
    const { todosConcluidos, algumaExecucao } = statusPorAula[i];
    return {
      aula,
      totalExercicios: exercicios.length,
      concluidaNaSemana: todosConcluidos,
      emAndamento: algumaExecucao && !todosConcluidos,
    };
  });
  const indiceHoje = aulaHoje ? aulas.findIndex((a) => a.id === aulaHoje.id) : -1;
  const totalExerciciosHoje = indiceHoje >= 0 ? exerciciosPorAula[indiceHoje].length : 0;
  const statusHoje = indiceHoje >= 0 ? statusPorAula[indiceHoje] : null;
  // com o treino de hoje em andamento, o botão pula direto pro primeiro
  // exercício ainda não concluído em vez de mandar pra lista de novo — o
  // aluno não precisa procurar onde parou (mesmo comportamento da Home).
  const proximoExercicioIdHoje = statusHoje?.itens.find((i) => !i.concluido)?.aulaExercicioId ?? null;
  const hojeEmAndamento = statusHoje ? statusHoje.algumaExecucao && !statusHoje.todosConcluidos : false;

  return (
    <div>
      <TopBar title="Treino" />
      <ScrollFit className="flex flex-col space-y-4 p-4">
        <div>
          <p className="text-xs text-muted">Ciclo atual</p>
          <p className="text-base font-bold text-foreground">
            {ciclo.nome} · {ciclo.duracao_semanas} semanas
          </p>
        </div>

        {aulaHoje ? (
          <Link
            href={
              hojeEmAndamento && proximoExercicioIdHoje
                ? `/treino/${aulaHoje.id}/exercicio/${proximoExercicioIdHoje}`
                : `/treino/${aulaHoje.id}`
            }
          >
            <Card className="relative flex flex-col overflow-hidden bg-primary p-5 text-white">
              <Dumbbell size={26} strokeWidth={1.75} className="absolute right-5 top-5 text-white/35" />
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/80">
                {hojeEmAndamento && <Clock size={12} />} {hojeEmAndamento ? "Em andamento" : "Próximo treino"}
              </p>
              <p className="mt-1.5 max-w-[80%] text-2xl font-extrabold leading-tight">
                {partesDoNome(aulaHoje.nome).subtitulo ?? aulaHoje.nome}
              </p>
              <p className="mt-1 text-sm text-white/80">
                {totalExerciciosHoje} exercícios
                {aulaHoje.duracao_estimada_min ? ` · ~${aulaHoje.duracao_estimada_min} min` : ""}
              </p>
              <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white py-3.5 text-center text-sm font-bold uppercase tracking-wide text-primary-dark">
                <Play size={14} className="fill-current" /> {hojeEmAndamento ? "Continuar treino" : "Começar treino"}
              </div>
            </Card>
          </Link>
        ) : (
          <Card className="relative flex flex-col bg-primary p-5 text-white">
            <Dumbbell size={26} strokeWidth={1.75} className="absolute right-5 top-5 text-white/35" />
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Próximo treino</p>
            <p className="mt-3 flex items-center gap-1.5 text-base font-semibold">
              <Moon size={16} /> Hoje é dia de descanso.
            </p>
          </Card>
        )}

        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Esta semana</p>

        <div className="space-y-4">
          {aulasComStatus.map(({ aula, totalExercicios, concluidaNaSemana, emAndamento }) => {
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
                      : emAndamento || destaque
                        ? "border-l-primary"
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
                  ) : emAndamento ? (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                      <Clock size={12} /> Em andamento
                    </span>
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
