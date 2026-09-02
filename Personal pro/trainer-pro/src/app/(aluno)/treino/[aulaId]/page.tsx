import { requireAluno } from "@/lib/data/current-user";
import { getExerciciosDaAula, getInicioTreinoHoje } from "@/lib/data/aluno";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/nav/top-bar";
import { TreinoTimer } from "@/components/treino-timer";
import { Card } from "@/components/ui/card";
import { ChevronRight, Flame, PlayCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AulaPage({
  params,
}: {
  params: Promise<{ aulaId: string }>;
}) {
  const { aluno } = await requireAluno();
  const { aulaId } = await params;
  const supabase = await createClient();

  const { data: aula } = await supabase.from("aulas").select("*").eq("id", aulaId).maybeSingle();
  if (!aula) notFound();

  const [exerciciosBrutos, inicioIso] = await Promise.all([
    getExerciciosDaAula(aulaId),
    getInicioTreinoHoje(aluno.id, aulaId),
  ]);

  // aquecimento + continuação do mesmo exercício são duas linhas no banco
  // (pra ter contagem de série diferente), mas formam UM fluxo só na
  // execução — aqui juntamos as duas numa única linha da lista, senão o
  // exercício aparece duplicado ("Supino... aquecimento" e "Supino..." de
  // novo logo em seguida)
  const itens: { principal: (typeof exerciciosBrutos)[number]; continuacao?: (typeof exerciciosBrutos)[number] }[] = [];
  for (let i = 0; i < exerciciosBrutos.length; i++) {
    const atual = exerciciosBrutos[i];
    const anterior = exerciciosBrutos[i - 1];
    if (anterior?.eh_aquecimento && anterior.exercicio_id === atual.exercicio_id) continue;
    const proximo = exerciciosBrutos[i + 1];
    const temContinuacao = atual.eh_aquecimento && proximo && proximo.exercicio_id === atual.exercicio_id;
    itens.push({ principal: atual, continuacao: temContinuacao ? proximo : undefined });
  }

  return (
    <div>
      <TopBar title={aula.nome} back="/treino" action={inicioIso ? <TreinoTimer inicioIso={inicioIso} /> : undefined} />
      <div className="space-y-3 p-4">
        {itens.map(({ principal: ex, continuacao }, i) => (
          <Link key={ex.id} href={`/treino/${aulaId}/exercicio/${ex.id}`}>
            <Card className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-dark">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                  {ex.exercicio.nome}
                  {ex.eh_aquecimento && (
                    <span className="flex items-center gap-0.5 rounded-pill bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning">
                      <Flame size={10} /> Aquecimento
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {continuacao
                    ? `${continuacao.series}x ${continuacao.repeticoes} · +${ex.series} de aquecimento`
                    : `${ex.series}x ${ex.repeticoes}${ex.carga_inicial ? ` · ${ex.carga_inicial}kg` : ""}`}
                </p>
              </div>
              <PlayCircle className="text-primary" size={22} />
              <ChevronRight className="text-muted-2" size={18} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
