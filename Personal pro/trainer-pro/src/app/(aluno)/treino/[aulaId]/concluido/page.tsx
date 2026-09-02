import { requireAluno } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { getExerciciosDaAula } from "@/lib/data/aluno";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { PartyPopper, Trophy, Dumbbell, Clock } from "lucide-react";

export default async function TreinoConcluidoPage({
  params,
}: {
  params: Promise<{ aulaId: string }>;
}) {
  const { aluno } = await requireAluno();
  const { aulaId } = await params;
  const supabase = await createClient();

  const [{ data: aula }, exercicios] = await Promise.all([
    supabase.from("aulas").select("*").eq("id", aulaId).maybeSingle(),
    getExerciciosDaAula(aulaId),
  ]);
  if (!aula) notFound();

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
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary">
        <PartyPopper size={40} />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Treino concluído!</h1>
        <p className="mt-1 text-sm text-muted">
          Você terminou &quot;{aula.nome}&quot; — {exercicios.length} exercícios registrados.
          Mandou bem. 💪
        </p>
      </div>

      <div className="grid w-full max-w-xs grid-cols-3 gap-2">
        <div className="rounded-xl bg-neutral-soft p-3">
          <Dumbbell size={16} className="mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{totalSeries}</p>
          <p className="text-[11px] text-muted">séries</p>
        </div>
        <div className="rounded-xl bg-neutral-soft p-3">
          <Clock size={16} className="mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{tempoMin || "—"}</p>
          <p className="text-[11px] text-muted">minutos</p>
        </div>
        <div className={`rounded-xl p-3 ${recordes > 0 ? "bg-success-soft" : "bg-neutral-soft"}`}>
          <Trophy size={16} className={`mx-auto mb-1 ${recordes > 0 ? "text-success" : "text-primary"}`} />
          <p className="text-lg font-bold">{recordes}</p>
          <p className="text-[11px] text-muted">{recordes === 1 ? "recorde" : "recordes"}</p>
        </div>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-3">
        <ButtonLink href="/home" className="w-full">
          Voltar para o início
        </ButtonLink>
        <ButtonLink href="/treino" variant="outline" className="w-full">
          Ver meu treino
        </ButtonLink>
      </div>
    </div>
  );
}
