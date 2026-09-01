import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { aplicarTemplateAoAluno, criarTemplateDeAluno } from "@/app/actions/templates";
import { Layers, Pencil, Plus } from "lucide-react";
import Link from "next/link";

export default async function TemplatesPage() {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const [{ data: templates }, { data: alunos }] = await Promise.all([
    supabase
      .from("templates")
      .select("*, template_aulas(id)")
      .eq("personal_id", personal.id)
      .order("nome"),
    supabase.from("alunos").select("id, nome").eq("personal_id", personal.id).order("nome"),
  ]);

  return (
    <div className="space-y-4 p-4 md:p-0">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Templates de treino</h1>
        <ButtonLink href="/templates/novo" size="sm" className="gap-1.5">
          <Plus size={16} /> Criar do zero
        </ButtonLink>
      </div>

      <Card>
        <CardTitle className="mb-3">Criar template a partir de um aluno</CardTitle>
        <form action={criarTemplateDeAluno} className="space-y-2">
          <input
            name="nome"
            required
            placeholder="Nome do template (ex: ABC intermediário 8 exercícios)"
            className="h-10 w-full rounded-lg border border-border px-3 text-sm"
          />
          <input
            name="descricao"
            placeholder="Descrição (opcional)"
            className="h-10 w-full rounded-lg border border-border px-3 text-sm"
          />
          <select name="origemAlunoId" required className="h-10 w-full rounded-lg border border-border px-3 text-sm">
            <option value="">Copiar treino ativo de...</option>
            {(alunos ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm">
            Salvar template
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        {(templates ?? []).map((t) => (
          <Card key={t.id}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-primary" />
                <div>
                  <CardTitle>{t.nome}</CardTitle>
                  <CardSubtitle>{t.template_aulas?.length ?? 0} aulas</CardSubtitle>
                </div>
              </div>
              <Link
                href={`/templates/${t.id}`}
                className="flex items-center gap-1 text-xs font-medium text-primary"
              >
                <Pencil size={13} /> Editar
              </Link>
            </div>
            {t.descricao && <p className="mb-2 text-sm text-muted">{t.descricao}</p>}
            <details>
              <summary className="cursor-pointer text-sm font-medium text-primary">
                Aplicar a um aluno
              </summary>
              <form action={aplicarTemplateAoAluno} className="mt-2 flex gap-2">
                <input type="hidden" name="templateId" value={t.id} />
                <select name="alunoId" required className="h-9 flex-1 rounded-lg border border-border px-2 text-sm">
                  <option value="">Selecione o aluno</option>
                  {(alunos ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm">
                  Aplicar
                </Button>
              </form>
            </details>
          </Card>
        ))}
        {(!templates || templates.length === 0) && (
          <p className="text-sm text-muted">Nenhum template salvo ainda.</p>
        )}
      </div>
    </div>
  );
}
