import { requireAluno } from "@/lib/data/current-user";
import { getExerciciosDaAula } from "@/lib/data/aluno";
import { createClient } from "@/lib/supabase/server";
import { inicioDoDiaBrasil } from "@/lib/status";
import { cn } from "@/lib/utils";
import { TopBar } from "@/components/nav/top-bar";
import { TreinoTimer } from "@/components/treino-timer";
import { ScrollFit } from "@/components/scroll-fit";
import { Card } from "@/components/ui/card";
import { CheckCircle2, ChevronRight, Flame, Link2, PlayCircle } from "lucide-react";
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

  const [{ data: aula }, exerciciosBrutos] = await Promise.all([
    supabase.from("aulas").select("*").eq("id", aulaId).maybeSingle(),
    getExerciciosDaAula(aulaId),
  ]);
  if (!aula) notFound();

  // conta execuções de hoje por exercício (pra marcar concluído, handoff de
  // hoje) e acha o início do treino (pro cronômetro) na MESMA query — os dois
  // vêm do mesmo conjunto de linhas, não precisa de duas idas ao banco
  const idsTodos = exerciciosBrutos.map((e) => e.id);
  const hojeInicio = inicioDoDiaBrasil();
  const { data: execucoesHoje } = idsTodos.length
    ? await supabase
        .from("execucoes")
        .select("aula_exercicio_id, data")
        .eq("aluno_id", aluno.id)
        .in("aula_exercicio_id", idsTodos)
        .gte("data", hojeInicio.toISOString())
    : { data: [] as { aula_exercicio_id: string; data: string }[] };
  const contagemPorExercicio = new Map<string, number>();
  let inicioIso: string | null = null;
  for (const e of execucoesHoje ?? []) {
    contagemPorExercicio.set(e.aula_exercicio_id, (contagemPorExercicio.get(e.aula_exercicio_id) ?? 0) + 1);
    if (!inicioIso || e.data < inicioIso) inicioIso = e.data;
  }

  // Duas formas de um exercício "absorver" o próximo na lista (mesma regra
  // da tela de execução, ver anteriorEhAquecimentoDoMesmo/combina_proximo em
  // exercicio/[aulaExercicioId]/page.tsx):
  // 1) Aquecimento + continuação do mesmo exercício são duas linhas no banco
  //    (pra ter contagem de série diferente), mas formam UM fluxo só —
  //    juntadas numa única linha da lista, senão o exercício aparece
  //    duplicado ("Supino... aquecimento" e "Supino..." de novo em seguida).
  // 2) Bi-set (combina_proximo) — dois exercícios DIFERENTES feitos juntos,
  //    sem descanso entre eles; antes apareciam como duas linhas soltas na
  //    lista (parecendo dois exercícios separados) quando são um só passo
  //    do treino.
  const itensBrutos: {
    principal: (typeof exerciciosBrutos)[number];
    continuacao?: (typeof exerciciosBrutos)[number];
    parceiro?: (typeof exerciciosBrutos)[number];
  }[] = [];
  for (let i = 0; i < exerciciosBrutos.length; i++) {
    const atual = exerciciosBrutos[i];
    const anterior = exerciciosBrutos[i - 1];
    const anteriorEhAquecimentoDoMesmo = anterior?.eh_aquecimento && anterior.exercicio_id === atual.exercicio_id;
    if (anterior?.combina_proximo || anteriorEhAquecimentoDoMesmo) continue;
    const proximo = exerciciosBrutos[i + 1];
    const temContinuacao = atual.eh_aquecimento && proximo && proximo.exercicio_id === atual.exercicio_id;
    const temParceiro = atual.combina_proximo && !!proximo;
    itensBrutos.push({
      principal: atual,
      continuacao: temContinuacao ? proximo : undefined,
      parceiro: temParceiro ? proximo : undefined,
    });
  }

  // REGRA: "concluído" é sempre contagem de série >= série exigida, nunca
  // "teve alguma execução". Essa checagem aqui é por-exercício-com-bi-set (pra
  // já sair pronta pra exibição da linha), então não dá pra reusar
  // getStatusExerciciosAulaDesde (aluno.ts) direto — mas segue a MESMA regra.
  // Ver o comentário grande lá pra histórico do porquê isso importa (bug real:
  // 1 série já bastava pra marcar aula/meta/aderência inteira como feita).
  const itens = itensBrutos.map((item) => {
    const feitoPrincipal = (contagemPorExercicio.get(item.principal.id) ?? 0) >= item.principal.series;
    const feitoContinuacao =
      !item.continuacao || (contagemPorExercicio.get(item.continuacao.id) ?? 0) >= item.continuacao.series;
    const feitoParceiro = !item.parceiro || (contagemPorExercicio.get(item.parceiro.id) ?? 0) >= item.parceiro.series;
    const concluido =
      item.principal.tipo === "cardio"
        ? (contagemPorExercicio.get(item.principal.id) ?? 0) > 0
        : feitoPrincipal && feitoContinuacao && feitoParceiro;
    return { ...item, concluido };
  });
  const indiceAtual = itens.findIndex((i) => !i.concluido);
  const concluidos = itens.filter((i) => i.concluido).length;
  const pct = itens.length > 0 ? Math.round((concluidos / itens.length) * 100) : 0;

  return (
    <div>
      <TopBar title={aula.nome} back="/treino" action={inicioIso ? <TreinoTimer inicioIso={inicioIso} /> : undefined} />
      <div className="space-y-2 p-4 pb-0">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted">{itens.length} exercícios</p>
          <p className="text-xs font-semibold text-muted">
            {concluidos} de {itens.length}
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ScrollFit className="p-4">
        <div className="space-y-3">
          {itens.map(({ principal: ex, continuacao, parceiro, concluido }, i) => (
            <Link key={ex.id} href={`/treino/${aulaId}/exercicio/${ex.id}`}>
              <Card className={cn("flex items-center gap-3", i === indiceAtual && "border-primary bg-primary-soft")}>
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    concluido ? "bg-success-soft text-success" : "bg-primary-soft text-primary-dark"
                  )}
                >
                  {concluido ? <CheckCircle2 size={18} /> : i + 1}
                </div>
                <div className="flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                    {parceiro ? `${ex.exercicio.nome} + ${parceiro.exercicio.nome}` : ex.exercicio.nome}
                    {parceiro && (
                      <span className="flex items-center gap-0.5 rounded-pill bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary-dark">
                        <Link2 size={10} /> Bi-set
                      </span>
                    )}
                    {ex.eh_aquecimento && (
                      <span className="flex items-center gap-0.5 rounded-pill bg-warning-soft px-1.5 py-0.5 text-[10px] font-medium text-warning">
                        <Flame size={10} /> Aquecimento
                      </span>
                    )}
                    {i === indiceAtual && !concluido && (
                      <span className="rounded-pill bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary-dark">
                        Você está aqui
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {continuacao
                      ? `${continuacao.series}x ${continuacao.repeticoes} · +${ex.series} de aquecimento`
                      : `${ex.series}x ${ex.repeticoes}${ex.carga_inicial ? ` · ${ex.carga_inicial}kg` : ""}`}
                  </p>
                </div>
                {concluido ? (
                  <CheckCircle2 className="text-success" size={22} />
                ) : (
                  <PlayCircle className="text-primary" size={22} />
                )}
                <ChevronRight className="text-muted-2" size={18} />
              </Card>
            </Link>
          ))}
        </div>
      </ScrollFit>
    </div>
  );
}
