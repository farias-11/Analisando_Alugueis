import { requireAluno } from "@/lib/data/current-user";
import {
  getAulaExercicio,
  getUltimaMarca,
  getExerciciosDaAula,
  getExecucoesDeHoje,
  getInicioTreinoHoje,
} from "@/lib/data/aluno";
import { notFound } from "next/navigation";
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

  const [ultimaMarca, exerciciosDaAula, execucoesDeHoje, inicioIso] = await Promise.all([
    getUltimaMarca(aluno.id, aulaExercicioId),
    getExerciciosDaAula(aulaId),
    getExecucoesDeHoje(aluno.id, aulaExercicioId),
    getInicioTreinoHoje(aluno.id, aulaId),
  ]);

  const ordem = exerciciosDaAula.map((e) => e.id);
  const posicaoAtual = ordem.indexOf(aulaExercicioId);
  const proximoExercicioId = posicaoAtual >= 0 ? (ordem[posicaoAtual + 1] ?? null) : null;
  const ehUltimoExercicio = posicaoAtual === ordem.length - 1;

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
      />
    </div>
  );
}
