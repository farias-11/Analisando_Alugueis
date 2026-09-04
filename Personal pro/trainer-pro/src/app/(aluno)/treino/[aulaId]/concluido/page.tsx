import { requireAluno } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { getExerciciosDaAula, getCicloAtivo, getAulasDoCiclo, getAderenciaSemana } from "@/lib/data/aluno";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Check, ChevronLeft, PartyPopper, Trophy, Dumbbell, Clock } from "lucide-react";

export default async function TreinoConcluidoPage({
  params,
}: {
  params: Promise<{ aulaId: string }>;
}) {
  const { aluno } = await requireAluno();
  const { aulaId } = await params;
  const supabase = await createClient();

  const [{ data: aula }, exercicios, ciclo] = await Promise.all([
    supabase.from("aulas").select("*").eq("id", aulaId).maybeSingle(),
    getExerciciosDaAula(aulaId),
    getCicloAtivo(aluno.id),
  ]);
  if (!aula) notFound();

  // meta semanal (mesmo dado da Home) pra celebrar o progresso da semana
  // aqui também, não só recordes/tempo deste treino específico
  const { concluidas: metaConcluidas, meta: metaTotal } = ciclo
    ? await getAderenciaSemana(aluno.id, await getAulasDoCiclo(ciclo.id))
    : { concluidas: 0, meta: 0 };

  const aulaExercicioIds = exercicios.map((e) => e.id);
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const { data: execHoje } = aulaExercicioIds.length
    ? await supabase
        .from("execucoes")
        .select("aula_exercicio_id, carga, data")
        .eq("aluno_id", aluno.id)
        .in("aula_exercicio_id", aulaExercicioIds)
        .gte("data", hojeInicio.toISOString())
        .order("data", { ascending: true })
    : { data: [] };

  const linhas = execHoje ?? [];
  const totalSeries = linhas.length;

  let tempoMin = 0;
  if (linhas.length >= 2) {
    const inicio = new Date(linhas[0].data).getTime();
    const fim = new Date(linhas[linhas.length - 1].data).getTime();
    tempoMin = Math.max(1, Math.round((fim - inicio) / 60000));
  }

  // recorde pessoal: maior carga de hoje, por exercício, comparada à maior carga
  // já registrada antes de hoje nesse mesmo exercício
  const maiorCargaHojePorExercicio = new Map<string, number>();
  for (const l of linhas) {
    if (l.carga === null) continue;
    const atual = maiorCargaHojePorExercicio.get(l.aula_exercicio_id) ?? 0;
    if (l.carga > atual) maiorCargaHojePorExercicio.set(l.aula_exercicio_id, l.carga);
  }

  let recordes = 0;
  if (maiorCargaHojePorExercicio.size > 0) {
    const { data: historico } = await supabase
      .from("execucoes")
      .select("aula_exercicio_id, carga")
      .eq("aluno_id", aluno.id)
      .in("aula_exercicio_id", Array.from(maiorCargaHojePorExercicio.keys()))
      .lt("data", hojeInicio.toISOString())
      .not("carga", "is", null);

    const maiorCargaAntesPorExercicio = new Map<string, number>();
    for (const h of historico ?? []) {
      const atual = maiorCargaAntesPorExercicio.get(h.aula_exercicio_id) ?? 0;
      if (h.carga! > atual) maiorCargaAntesPorExercicio.set(h.aula_exercicio_id, h.carga!);
    }

    for (const [exId, cargaHoje] of maiorCargaHojePorExercicio) {
      const anterior = maiorCargaAntesPorExercicio.get(exId);
      if (anterior !== undefined && cargaHoje > anterior) recordes++;
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="relative flex flex-col items-center gap-4 bg-primary px-6 pb-10 pt-6 text-center text-white">
        <Link
          href={`/treino/${aulaId}`}
          className="absolute left-4 top-6 flex h-8 w-8 items-center justify-center rounded-full text-white/90 hover:bg-white/10"
        >
          <ChevronLeft size={20} />
        </Link>
        <div className="mt-6 flex h-20 w-20 items-center justify-center rounded-full bg-white text-primary">
          <PartyPopper size={40} />
        </div>
        <div>
          <h1 className="text-xl font-extrabold uppercase tracking-wide">Treino concluído!</h1>
          <p className="mt-1 text-lg font-semibold text-white/90">{aula.nome}</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 px-6 py-6">
        <div className="grid w-full grid-cols-3 gap-2">
          <div className="rounded-xl bg-neutral-soft p-3 text-center">
            <Dumbbell size={16} className="mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{exercicios.length}</p>
            <p className="text-[11px] text-muted">exercícios</p>
          </div>
          <div className="rounded-xl bg-neutral-soft p-3 text-center">
            <Trophy size={16} className="mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{totalSeries}</p>
            <p className="text-[11px] text-muted">séries</p>
          </div>
          <div className="rounded-xl bg-neutral-soft p-3 text-center">
            <Clock size={16} className="mx-auto mb-1 text-primary" />
            <p className="text-lg font-bold">{tempoMin || "—"}</p>
            <p className="text-[11px] text-muted">minutos</p>
          </div>
        </div>

        {recordes > 0 && (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            <Trophy size={18} />
            {recordes} {recordes === 1 ? "recorde pessoal batido" : "recordes pessoais batidos"} hoje! 🎉
          </div>
        )}

        {metaTotal > 0 && (
          <div className="text-center">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">Meta semanal</p>
            <div className="flex justify-center gap-2">
              {Array.from({ length: metaTotal }, (_, i) => i < metaConcluidas).map((feito, i) => (
                <div
                  key={i}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    feito ? "bg-primary text-white" : "border-2 border-border text-border"
                  }`}
                >
                  {feito && <Check size={16} strokeWidth={3} />}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">
              {metaConcluidas} de {metaTotal} treinos
            </p>
          </div>
        )}

        <div className="mt-auto flex w-full flex-col gap-3">
          <ButtonLink href="/home" className="w-full">
            Voltar para o início
          </ButtonLink>
          <ButtonLink href="/treino" variant="outline" className="w-full">
            Ver meu treino
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
