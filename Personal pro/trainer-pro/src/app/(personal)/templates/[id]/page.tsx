import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/nav/top-bar";
import { DiasSemanaPicker } from "@/components/dias-semana-picker";
import { TemplateExercicioRow } from "@/components/template-exercicio-row";
import { AdicionarExercicioTemplateSection } from "@/components/adicionar-exercicio-template-section";
import {
  criarTemplateAula,
  removerTemplateAula,
  moverTemplateAula,
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
                <TemplateExercicioRow
                  key={ex.id}
                  ex={ex}
                  templateId={templateId}
                  templateAulaId={aula.id}
                  biblioteca={biblioteca}
                  ehPrimeiro={exIndex === 0}
                  ehUltimo={exIndex === aula.template_aula_exercicios.length - 1}
                />
              ))}
            </div>

            <AdicionarExercicioTemplateSection
              templateId={templateId}
              templateAulaId={aula.id}
              biblioteca={biblioteca}
            />
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
