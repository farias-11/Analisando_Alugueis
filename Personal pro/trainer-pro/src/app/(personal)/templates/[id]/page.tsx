import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/nav/top-bar";
import { DiasSemanaPicker } from "@/components/dias-semana-picker";
import {
  criarTemplateAula,
  removerTemplateAula,
  moverTemplateAula,
  adicionarExercicioTemplateAula,
  removerExercicioTemplateAula,
  moverExercicioTemplateAula,
  atualizarDiasSemanaTemplateAula,
  excluirTemplate,
} from "@/app/actions/templates";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { TemplateAula, TemplateAulaExercicio, Exercicio } from "@/lib/types";

export default async function EditorTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { personal } = await requirePersonal();
  const { id: templateId } = await params;
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("templates")
    .select("*")
    .eq("id", templateId)
    .eq("personal_id", personal.id)
    .maybeSingle();
  if (!template) notFound();

  const [{ data: aulas }, { data: exercicios }] = await Promise.all([
    supabase
      .from("template_aulas")
      .select("*, template_aula_exercicios(*, exercicio:exercicios(*))")
      .eq("template_id", templateId)
      .order("ordem"),
    supabase.from("exercicios").select("*").eq("personal_id", personal.id).order("nome"),
  ]);

  const aulasComExercicios = (aulas ?? []) as (TemplateAula & {
    template_aula_exercicios: (TemplateAulaExercicio & { exercicio: Exercicio })[];
  })[];
  const biblioteca = exercicios ?? [];

  return (
    <div>
      <TopBar title={`Template — ${template.nome}`} back="/templates" />

      <div className="space-y-4 p-4 md:max-w-2xl md:p-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{template.nome}</CardTitle>
              {template.descricao && <p className="text-sm text-muted">{template.descricao}</p>}
            </div>
            <form action={excluirTemplate}>
              <input type="hidden" name="templateId" value={templateId} />
              <button type="submit" className="text-muted-2 hover:text-danger">
                <Trash2 size={18} />
              </button>
            </form>
          </div>
        </Card>

        {aulasComExercicios.map((aula, aulaIndex) => (
          <Card key={aula.id}>
            <div className="mb-1 flex items-center justify-between">
              <CardTitle>{aula.nome}</CardTitle>
              <div className="flex items-center gap-1">
                <form action={moverTemplateAula}>
                  <input type="hidden" name="templateId" value={templateId} />
                  <input type="hidden" name="templateAulaId" value={aula.id} />
                  <input type="hidden" name="direcao" value="up" />
                  <button
                    type="submit"
                    disabled={aulaIndex === 0}
                    className="text-muted-2 hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronUp size={16} />
                  </button>
                </form>
                <form action={moverTemplateAula}>
                  <input type="hidden" name="templateId" value={templateId} />
                  <input type="hidden" name="templateAulaId" value={aula.id} />
                  <input type="hidden" name="direcao" value="down" />
                  <button
                    type="submit"
                    disabled={aulaIndex === aulasComExercicios.length - 1}
                    className="text-muted-2 hover:text-foreground disabled:opacity-30"
                  >
                    <ChevronDown size={16} />
                  </button>
                </form>
                <form action={removerTemplateAula}>
                  <input type="hidden" name="templateId" value={templateId} />
                  <input type="hidden" name="templateAulaId" value={aula.id} />
                  <button type="submit" className="ml-1 text-muted-2 hover:text-danger">
                    <Trash2 size={16} />
                  </button>
                </form>
              </div>
            </div>

            <div className="mb-3">
              <DiasSemanaPicker
                extraFields={{ templateId, templateAulaId: aula.id }}
                diasIniciais={aula.dias_semana}
                action={atualizarDiasSemanaTemplateAula}
              />
            </div>

            <div className="space-y-2">
              {aula.template_aula_exercicios.map((ex, exIndex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-lg bg-neutral-soft px-3 py-2 text-sm"
                >
                  <span>{ex.exercicio?.nome}</span>
                  <div className="flex items-center gap-1.5 text-muted">
                    <span className="mr-1">
                      {ex.series}x{ex.repeticoes} · {ex.carga_inicial ?? "—"}kg · {ex.descanso_seg}s
                    </span>
                    <form action={moverExercicioTemplateAula}>
                      <input type="hidden" name="templateId" value={templateId} />
                      <input type="hidden" name="templateAulaId" value={aula.id} />
                      <input type="hidden" name="templateAulaExercicioId" value={ex.id} />
                      <input type="hidden" name="direcao" value="up" />
                      <button
                        type="submit"
                        disabled={exIndex === 0}
                        className="text-muted-2 hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronUp size={14} />
                      </button>
                    </form>
                    <form action={moverExercicioTemplateAula}>
                      <input type="hidden" name="templateId" value={templateId} />
                      <input type="hidden" name="templateAulaId" value={aula.id} />
                      <input type="hidden" name="templateAulaExercicioId" value={ex.id} />
                      <input type="hidden" name="direcao" value="down" />
                      <button
                        type="submit"
                        disabled={exIndex === aula.template_aula_exercicios.length - 1}
                        className="text-muted-2 hover:text-foreground disabled:opacity-30"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </form>
                    <form action={removerExercicioTemplateAula}>
                      <input type="hidden" name="templateId" value={templateId} />
                      <input type="hidden" name="templateAulaExercicioId" value={ex.id} />
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
              <form
                action={adicionarExercicioTemplateAula}
                className="mt-2 space-y-2 rounded-lg border border-border p-3"
              >
                <input type="hidden" name="templateId" value={templateId} />
                <input type="hidden" name="templateAulaId" value={aula.id} />
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
          <form action={criarTemplateAula} className="flex items-center gap-2">
            <input type="hidden" name="templateId" value={templateId} />
            <input
              name="nome"
              placeholder={`Aula ${aulasComExercicios.length + 1}`}
              className="h-10 flex-1 rounded-lg border border-border px-3 text-sm"
            />
            <Button type="submit" variant="outline" size="sm">
              + Adicionar aula
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
