import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { getAulasDoCiclo, getCicloAtivo, getExerciciosDaAula, getSugestoesRenovacao } from "@/lib/data/aluno";
import { getContextoAluno } from "@/lib/data/contexto";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContextoAlunoPanel } from "@/components/contexto-aluno-panel";
import { RealtimeTreinoSync } from "@/components/realtime-treino-sync";
import { TopBar } from "@/components/nav/top-bar";
import { AdicionarExercicioSection } from "@/components/adicionar-exercicio-section";
import { ExercicioAulaRow } from "@/components/exercicio-aula-row";
import {
  atualizarDuracaoCiclo,
  criarAula,
  criarCiclo,
  duplicarTreinoDeOutroAluno,
  removerAula,
  moverAula,
  atualizarDiasSemanaAula,
} from "@/app/actions/treinos";
import { aplicarTemplateAoAluno } from "@/app/actions/templates";
import { RenovarCicloModal } from "@/components/renovar-ciclo-modal";
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

  const [ciclo, exercicios, contexto, outrosAlunos, ciclosAtivos, templates] = await Promise.all([
    getCicloAtivo(alunoId),
    supabase.from("exercicios").select("*").eq("personal_id", personal.id).order("nome"),
    getContextoAluno(alunoId),
    supabase.from("alunos").select("id, nome").eq("personal_id", personal.id).neq("id", alunoId).order("nome"),
    supabase.from("ciclos").select("aluno_id").eq("ativo", true),
    supabase.from("templates").select("id, nome").eq("personal_id", personal.id).order("nome"),
  ]);
  const listaTemplates = templates.data ?? [];
  const alunoIdsComCiclo = new Set((ciclosAtivos.data ?? []).map((c) => c.aluno_id));
  const alunosParaDuplicar = (outrosAlunos.data ?? []).filter((a) => alunoIdsComCiclo.has(a.id));

  const aulas = ciclo ? await getAulasDoCiclo(ciclo.id) : [];
  const aulasComExercicios = await Promise.all(
    aulas.map(async (a) => ({ aula: a, exercicios: await getExerciciosDaAula(a.id) }))
  );
  const biblioteca = exercicios.data ?? [];
  // exercícios com ticket de dor nos últimos 30 dias — pra alertar o personal
  // no momento em que for adicionar (ou já tiver) um desses de novo (item C19)
  const nomesComTicketRecente = new Set(contexto.ticketsRecentes.map((t) => t.exercicioNome));
  const statusCicloAtual = ciclo ? statusCiclo(ciclo.data_fim) : null;
  const sugestoesRenovacao =
    ciclo && statusCicloAtual !== "ativo" ? await getSugestoesRenovacao(ciclo.id) : [];

  return (
    <div>
      <TopBar title={`Editor de treino — ${aluno.nome}`} back={`/alunos/${alunoId}?aba=treino`} />
      <RealtimeTreinoSync cicloId={ciclo?.id ?? null} aulaIds={aulas.map((a) => a.id)} />

      <div className="grid gap-4 p-4 md:grid-cols-[1fr_320px] md:p-6">
        <div className="space-y-4">
          {!ciclo ? (
            <Card>
              <p className="mb-3 text-sm text-muted">Este aluno ainda não tem um ciclo de treino.</p>
              <form action={criarCiclo} className="mb-3">
                <input type="hidden" name="alunoId" value={alunoId} />
                <Button type="submit">Criar ciclo de treino</Button>
              </form>
              {listaTemplates.length > 0 && (
                <details className="mb-3">
                  <summary className="cursor-pointer text-sm font-medium text-primary">
                    ou aplicar um template pronto
                  </summary>
                  <form action={aplicarTemplateAoAluno} className="mt-2 flex gap-2">
                    <input type="hidden" name="alunoId" value={alunoId} />
                    <select
                      name="templateId"
                      required
                      className="h-9 flex-1 rounded-lg border border-border px-2 text-sm"
                    >
                      <option value="">Selecione o template</option>
                      {listaTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" size="sm" variant="outline">
                      Aplicar
                    </Button>
                  </form>
                </details>
              )}
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
                    <RenovarCicloModal alunoId={alunoId} cicloId={ciclo.id} sugestoes={sugestoesRenovacao} />
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

              {listaTemplates.length > 0 && (
                <Card>
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-primary">
                      Aplicar um template pronto (substitui o treino atual)
                    </summary>
                    <form action={aplicarTemplateAoAluno} className="mt-2 flex gap-2">
                      <input type="hidden" name="alunoId" value={alunoId} />
                      <select
                        name="templateId"
                        required
                        className="h-9 flex-1 rounded-lg border border-border px-2 text-sm"
                      >
                        <option value="">Selecione o template</option>
                        {listaTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nome}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        Aplicar
                      </Button>
                    </form>
                  </details>
                </Card>
              )}

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
                      <ExercicioAulaRow
                        key={ex.id}
                        ex={ex}
                        alunoId={alunoId}
                        aulaId={aula.id}
                        biblioteca={biblioteca}
                        nomesComTicketRecente={Array.from(nomesComTicketRecente)}
                        ehPrimeiro={exIndex === 0}
                        ehUltimo={exIndex === exs.length - 1}
                      />
                    ))}
                  </div>

                  <AdicionarExercicioSection
                    alunoId={alunoId}
                    aulaId={aula.id}
                    biblioteca={biblioteca}
                    nomesComTicketRecente={Array.from(nomesComTicketRecente)}
                  />
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
