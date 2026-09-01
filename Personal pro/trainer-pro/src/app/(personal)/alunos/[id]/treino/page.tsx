import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { getAulasDoCiclo, getCicloAtivo, getExerciciosDaAula } from "@/lib/data/aluno";
import { getContextoAluno } from "@/lib/data/contexto";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContextoAlunoPanel } from "@/components/contexto-aluno-panel";
import { TopBar } from "@/components/nav/top-bar";
import {
  atualizarDuracaoCiclo,
  criarAula,
  criarCiclo,
  duplicarTreinoDeOutroAluno,
  renovarCiclo,
  adicionarExercicioAula,
  removerAula,
  removerExercicioAula,
  moverAula,
  moverExercicioAula,
  atualizarDiasSemanaAula,
} from "@/app/actions/treinos";
import { Badge } from "@/components/ui/badge";
import { DiasSemanaPicker } from "@/components/dias-semana-picker";
import { statusCiclo } from "@/lib/status";
import { AlertTriangle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";

export default async function EditorTreinoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { personal } = await requirePersonal();
  const { id: alunoId } = await params;
  const supabase = await createClient();

  const { data: aluno } = await supabase
    .from("alunos")
    .select("id, nome")
    .eq("id", alunoId)
    .eq("personal_id", personal.id)
    .maybeSingle();
  if (!aluno) notFound();

  const [ciclo, exercicios, contexto, outrosAlunos, ciclosAtivos] = await Promise.all([
    getCicloAtivo(alunoId),
    supabase.from("exercicios").select("*").eq("personal_id", personal.id).order("nome"),
    getContextoAluno(alunoId),
    supabase.from("alunos").select("id, nome").eq("personal_id", personal.id).neq("id", alunoId).order("nome"),
    supabase.from("ciclos").select("aluno_id").eq("ativo", true),
  ]);
  const alunoIdsComCiclo = new Set((ciclosAtivos.data ?? []).map((c) => c.aluno_id));
  const alunosParaDuplicar = (outrosAlunos.data ?? []).filter((a) => alunoIdsComCiclo.has(a.id));

  const aulas = ciclo ? await getAulasDoCiclo(ciclo.id) : [];
  const aulasComExercicios = await Promise.all(
    aulas.map(async (a) => ({ aula: a, exercicios: await getExerciciosDaAula(a.id) }))
  );
  const biblioteca = exercicios.data ?? [];

  return (
    <div>
      <TopBar title={`Editor de treino — ${aluno.nome}`} back={`/alunos/${alunoId}?aba=treino`} />

      <div className="grid gap-4 p-4 md:grid-cols-[1fr_320px] md:p-6">
        <div className="space-y-4">
          {!ciclo ? (
            <Card>
              <p className="mb-3 text-sm text-muted">Este aluno ainda não tem um ciclo de treino.</p>
              <form action={criarCiclo} className="mb-3">
                <input type="hidden" name="alunoId" value={alunoId} />
                <Button type="submit">Criar ciclo de treino</Button>
              </form>
              {alunosParaDuplicar.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    ou duplicar o treino de outro aluno
                  </summary>
                  <form action={duplicarTreinoDeOutroAluno} className="mt-2 flex gap-2">
                    <input type="hidden" name="alunoId" value={alunoId} />
                    <select
                      name="origemAlunoId"
                      required
                      className="h-9 flex-1 rounded-lg border border-border px-2 text-sm"
                    >
                      <option value="">Selecione o aluno de origem</option>
                      {alunosParaDuplicar.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nome}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Duplicar
                    </Button>
                  </form>
                </details>
              )}
            </Card>
          ) : (
            <>
              {(() => {
                const status = statusCiclo(ciclo.data_fim);
                if (status === "ativo") return null;
                return (
                  <Card className="flex items-center justify-between border-warning/30 bg-warning-soft">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-warning" />
                      <div>
                        <p className="text-sm font-medium text-warning">
                          {status === "vencido" ? "Este ciclo já venceu." : "Este ciclo está vencendo."}
                        </p>
                        <p className="text-xs text-muted">
                          Renovar encerra o ciclo atual e começa um novo hoje, copiando as aulas.
                        </p>
                      </div>
                    </div>
                    <form action={renovarCiclo}>
                      <input type="hidden" name="alunoId" value={alunoId} />
                      <input type="hidden" name="cicloId" value={ciclo.id} />
                      <Button type="submit" size="sm">
                        Renovar ciclo
                      </Button>
                    </form>
                  </Card>
                );
              })()}

              <Card className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>Duração do ciclo</CardTitle>
                  <Badge status={statusCiclo(ciclo.data_fim)} />
                </div>
                <form action={atualizarDuracaoCiclo} className="flex items-center gap-2">
                  <input type="hidden" name="alunoId" value={alunoId} />
                  <input type="hidden" name="cicloId" value={ciclo.id} />
                  <select
                    name="duracaoSemanas"
                    defaultValue={ciclo.duracao_semanas}
                    className="h-9 rounded-lg border border-border px-2 text-sm"
                  >
                    {[2, 4, 6, 8, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} semanas
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" variant="outline">
                    Salvar
                  </Button>
                </form>
              </Card>

              {aulasComExercicios.map(({ aula, exercicios: exs }, aulaIndex) => (
                <Card key={aula.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <CardTitle>{aula.nome}</CardTitle>
                    <div className="flex items-center gap-1">
                      <form action={moverAula}>
                        <input type="hidden" name="alunoId" value={alunoId} />
                        <input type="hidden" name="cicloId" value={ciclo.id} />
                        <input type="hidden" name="aulaId" value={aula.id} />
                        <input type="hidden" name="direcao" value="up" />
                        <button
                          type="submit"
                          disabled={aulaIndex === 0}
                          className="text-muted-2 hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </form>
                      <form action={moverAula}>
                        <input type="hidden" name="alunoId" value={alunoId} />
                        <input type="hidden" name="cicloId" value={ciclo.id} />
                        <input type="hidden" name="aulaId" value={aula.id} />
                        <input type="hidden" name="direcao" value="down" />
                        <button
                          type="submit"
                          disabled={aulaIndex === aulasComExercicios.length - 1}
                          className="text-muted-2 hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronDown size={16} />
                        </button>
                      </form>
                      <form action={removerAula}>
                        <input type="hidden" name="alunoId" value={alunoId} />
                        <input type="hidden" name="aulaId" value={aula.id} />
                        <button type="submit" className="ml-1 text-muted-2 hover:text-danger">
                          <Trash2 size={16} />
                        </button>
                      </form>
                    </div>
                  </div>

                  <div className="mb-3">
                    <DiasSemanaPicker
                      extraFields={{ alunoId, aulaId: aula.id }}
                      diasIniciais={aula.dias_semana}
                      action={atualizarDiasSemanaAula}
                    />
                  </div>

                  <div className="space-y-2">
                    {exs.map((ex, exIndex) => (
                      <div
                        key={ex.id}
                        className="flex items-center justify-between rounded-lg bg-neutral-soft px-3 py-2 text-sm"
                      >
                        <span>{ex.exercicio.nome}</span>
                        <div className="flex items-center gap-1.5 text-muted">
                          <span className="mr-1">
                            {ex.series}x{ex.repeticoes} · {ex.carga_inicial ?? "—"}kg ·{" "}
                            {ex.descanso_seg}s
                          </span>
                          <form action={moverExercicioAula}>
                            <input type="hidden" name="alunoId" value={alunoId} />
                            <input type="hidden" name="aulaId" value={aula.id} />
                            <input type="hidden" name="aulaExercicioId" value={ex.id} />
                            <input type="hidden" name="direcao" value="up" />
                            <button
                              type="submit"
                              disabled={exIndex === 0}
                              className="text-muted-2 hover:text-foreground disabled:opacity-30"
                            >
                              <ChevronUp size={14} />
                            </button>
                          </form>
                          <form action={moverExercicioAula}>
                            <input type="hidden" name="alunoId" value={alunoId} />
                            <input type="hidden" name="aulaId" value={aula.id} />
                            <input type="hidden" name="aulaExercicioId" value={ex.id} />
                            <input type="hidden" name="direcao" value="down" />
                            <button
                              type="submit"
                              disabled={exIndex === exs.length - 1}
                              className="text-muted-2 hover:text-foreground disabled:opacity-30"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </form>
                          <form action={removerExercicioAula}>
                            <input type="hidden" name="alunoId" value={alunoId} />
                            <input type="hidden" name="aulaExercicioId" value={ex.id} />
                            <button type="submit" className="text-muted-2 hover:text-danger">
                              <Trash2 size={14} />
                            </button>
                          </form>
                        </div>
                      </div>
                    ))}
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-medium text-primary">
                      + Adicionar exercício
                    </summary>
                    <form action={adicionarExercicioAula} className="mt-2 space-y-2 rounded-lg border border-border p-3">
                      <input type="hidden" name="alunoId" value={alunoId} />
                      <input type="hidden" name="aulaId" value={aula.id} />
                      <select
                        name="exercicioId"
                        required
                        className="h-9 w-full rounded-lg border border-border px-2 text-sm"
                      >
                        <option value="">Selecione um exercício</option>
                        {biblioteca.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.nome} ({ex.grupo_muscular})
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-4 gap-2">
                        <input name="series" type="number" defaultValue={3} placeholder="Séries" className="h-9 rounded-lg border border-border px-2 text-sm" />
                        <input name="repeticoes" defaultValue="10-12" placeholder="Reps" className="h-9 rounded-lg border border-border px-2 text-sm" />
                        <input name="cargaInicial" type="number" step="0.5" placeholder="Carga" className="h-9 rounded-lg border border-border px-2 text-sm" />
                        <input name="descansoSeg" type="number" defaultValue={60} placeholder="Descanso" className="h-9 rounded-lg border border-border px-2 text-sm" />
                      </div>
                      <Button type="submit" size="sm" className="w-full">
                        Adicionar
                      </Button>
                    </form>
                  </details>
                </Card>
              ))}

              <Card>
                <form action={criarAula} className="flex items-center gap-2">
                  <input type="hidden" name="alunoId" value={alunoId} />
                  <input type="hidden" name="cicloId" value={ciclo.id} />
                  <input
                    name="nome"
                    placeholder={`Aula ${aulas.length + 1}`}
                    className="h-10 flex-1 rounded-lg border border-border px-3 text-sm"
                  />
                  <Button type="submit" variant="outline" size="sm">
                    + Adicionar aula
                  </Button>
                </form>
              </Card>
            </>
          )}
        </div>

        <div>
          <ContextoAlunoPanel contexto={contexto} />
        </div>
      </div>
    </div>
  );
}
