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

type RegistroCompleto = AulaExercicio & { exercicio: Exercicio & { midias: ExercicioMidia[] }; aula: Aula };

export default async function ExecucaoExercicioPage({
  params,
}: {
  params: Promise<{ aulaId: string; aulaExercicioId: string }>;
}) {
  const { aluno } = await requireAluno();
  const { aulaId, aulaExercicioId } = await params;

  const [registro, exerciciosDaAula] = (await Promise.all([
    getAulaExercicio(aulaExercicioId),
    getExerciciosDaAula(aulaId),
  ])) as [RegistroCompleto | null, Awaited<ReturnType<typeof getExerciciosDaAula>>];
  if (!registro) notFound();

  const ordem = exerciciosDaAula.map((e) => e.id);
  const posicaoAtual = ordem.indexOf(aulaExercicioId);
  const anterior = posicaoAtual > 0 ? exerciciosDaAula[posicaoAtual - 1] : null;
  const proximo = exerciciosDaAula[posicaoAtual + 1] ?? null;

  // Duas formas de um exercício "absorver" o próximo, sem página própria pra ele:
  // 1) Bi-set/superset (combina_proximo=true) — os dois exercícios diferentes,
  //    feitos em paralelo, sem descanso entre eles.
  // 2) Aquecimento + valendo do mesmo exercício — em vez de duas entradas
  //    separadas na lista do aluno, viram uma sequência única de séries (as
  //    de aquecimento primeiro, destacadas, seguidas das que valem).
  const anteriorEhAquecimentoDoMesmo = anterior?.eh_aquecimento && anterior.exercicio_id === registro.exercicio_id;
  if (anterior?.combina_proximo || anteriorEhAquecimentoDoMesmo) {
    redirect(`/treino/${aulaId}/exercicio/${anterior!.id}`);
  }

  const ehAquecimentoComContinuacao =
    registro.eh_aquecimento && proximo && proximo.exercicio_id === registro.exercicio_id;
  const parceiroId = registro.combina_proximo ? (proximo?.id ?? null) : null;
  const continuacaoId = ehAquecimentoComContinuacao ? (proximo!.id ?? null) : null;

  const [
    ultimaMarca,
    execucoesDeHoje,
    inicioIso,
    parceiroRegistro,
    ultimaMarcaParceiro,
    execucoesDeHojeParceiro,
    continuacaoRegistro,
    ultimaMarcaContinuacao,
    execucoesDeHojeContinuacao,
  ] = await Promise.all([
    getUltimaMarca(aluno.id, aulaExercicioId),
    getExecucoesDeHoje(aluno.id, aulaExercicioId),
    getInicioTreinoHoje(aluno.id, ordem),
    parceiroId ? (getAulaExercicio(parceiroId) as Promise<RegistroCompleto | null>) : Promise.resolve(null),
    parceiroId ? getUltimaMarca(aluno.id, parceiroId) : Promise.resolve(null),
    parceiroId ? getExecucoesDeHoje(aluno.id, parceiroId) : Promise.resolve({}),
    continuacaoId ? (getAulaExercicio(continuacaoId) as Promise<RegistroCompleto | null>) : Promise.resolve(null),
    continuacaoId ? getUltimaMarca(aluno.id, continuacaoId) : Promise.resolve(null),
    continuacaoId ? getExecucoesDeHoje(aluno.id, continuacaoId) : Promise.resolve({}),
  ]);

  // pula o parceiro/continuação na numeração — já é coberto pela página combinada
  const absorveProximo = parceiroId || continuacaoId;
  const proximaPosicao = absorveProximo ? posicaoAtual + 2 : posicaoAtual + 1;
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
        continuacao={continuacaoRegistro}
        ultimaMarcaContinuacao={ultimaMarcaContinuacao}
        execucoesDeHojeContinuacao={execucoesDeHojeContinuacao}
      />
    </div>
  );
}
