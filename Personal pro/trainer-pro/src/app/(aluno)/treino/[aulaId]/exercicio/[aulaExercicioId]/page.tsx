import { requireAluno } from "@/lib/data/current-user";
import {
  getAulaExercicio,
  getUltimaMarca,
  getExerciciosDaAula,
  getExecucoesDeHoje,
  getInicioTreinoHoje,
} from "@/lib/data/aluno";
import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/nav/top-bar";
import { TreinoTimer } from "@/components/treino-timer";
import { ExecucaoClient } from "./execucao-client";
import type { AulaExercicio, Aula, Exercicio, ExercicioMidia } from "@/lib/types";

export default async function ExecucaoExercicioPage({
  params,
}: {
  params: Promise<{ aulaId: string; aulaExercicioId: string }>;
}) {
  const { aluno } = await requireAluno();
  const { aulaId, aulaExercicioId } = await params;

  const registro = (await getAulaExercicio(aulaExercicioId)) as
    | (AulaExercicio & { exercicio: Exercicio & { midias: ExercicioMidia[] }; aula: Aula })
    | null;

  if (!registro) notFound();

  const exerciciosDaAula = await getExerciciosDaAula(aulaId);
  const ordem = exerciciosDaAula.map((e) => e.id);
  const posicaoAtual = ordem.indexOf(aulaExercicioId);

  // Bi-set/superset (handoff): o exercício "combina_proximo=true" e o
  // seguinte na aula se fazem juntos, sem descanso entre os dois. O segundo
  // não tem página própria — cair nele redireciona pro primeiro, que
  // concentra a série combinada dos dois.
  const anterior = posicaoAtual > 0 ? exerciciosDaAula[posicaoAtual - 1] : null;
  if (anterior?.combina_proximo) {
    redirect(`/treino/${aulaId}/exercicio/${anterior.id}`);
  }

  const parceiroId = registro.combina_proximo ? (ordem[posicaoAtual + 1] ?? null) : null;

  const [ultimaMarca, execucoesDeHoje, inicioIso, parceiroRegistro, ultimaMarcaParceiro, execucoesDeHojeParceiro] =
    await Promise.all([
      getUltimaMarca(aluno.id, aulaExercicioId),
      getExecucoesDeHoje(aluno.id, aulaExercicioId),
      getInicioTreinoHoje(aluno.id, aulaId),
      parceiroId
        ? (getAulaExercicio(parceiroId) as Promise<
            (AulaExercicio & { exercicio: Exercicio & { midias: ExercicioMidia[] }; aula: Aula }) | null
          >)
        : Promise.resolve(null),
      parceiroId ? getUltimaMarca(aluno.id, parceiroId) : Promise.resolve(null),
      parceiroId ? getExecucoesDeHoje(aluno.id, parceiroId) : Promise.resolve({}),
    ]);

  // pula o parceiro na numeração — ele já é coberto pela página combinada
  const proximaPosicao = parceiroId ? posicaoAtual + 2 : posicaoAtual + 1;
  const proximoExercicioId = proximaPosicao < ordem.length ? ordem[proximaPosicao] : null;
  const ehUltimoExercicio = proximaPosicao >= ordem.length;

  return (
    <div>
      <TopBar
        title={registro.exercicio.nome}
        back={`/treino/${aulaId}`}
        action={<TreinoTimer inicioIso={inicioIso} />}
      />
      <ExecucaoClient
        aulaId={aulaId}
        aulaExercicio={registro}
        ultimaMarca={ultimaMarca}
        execucoesDeHoje={execucoesDeHoje}
        proximoExercicioId={proximoExercicioId}
        ehUltimoExercicio={ehUltimoExercicio}
        parceiro={parceiroRegistro}
        ultimaMarcaParceiro={ultimaMarcaParceiro}
        execucoesDeHojeParceiro={execucoesDeHojeParceiro}
      />
    </div>
  );
}
