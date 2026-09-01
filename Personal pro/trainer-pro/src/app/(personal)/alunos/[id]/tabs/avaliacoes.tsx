import { createClient } from "@/lib/supabase/server";
import { getGraficoBioimpedancia } from "@/lib/data/graficos";
import { Card, CardTitle } from "@/components/ui/card";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { Button } from "@/components/ui/button";
import { registrarBioimpedancia } from "@/app/actions/bioimpedancia";
import { formatDataBR } from "@/lib/status";
import type { Aluno } from "@/lib/types";

const LABELS: Record<string, string> = {
  idade: "Idade",
  profissao: "Profissão",
  nivel_atividade: "Nível de atividade",
  doencas: "Doenças diagnosticadas",
  medicamentos: "Medicamentos de uso contínuo",
  cirurgias: "Cirurgias anteriores",
  lesoes_dores: "Lesões e dores atuais",
  fisioterapia: "Histórico de fisioterapia",
  fumante: "Fumante",
  alcool: "Álcool",
  sono: "Sono",
  estresse: "Estresse",
  objetivo_principal: "Objetivo principal",
  experiencia_previa: "Experiência prévia",
  observacoes: "Observações",
};

export async function AvaliacoesTab({ aluno }: { aluno: Aluno }) {
  const supabase = await createClient();
  const { data: anamnese } = await supabase
    .from("anamneses")
    .select("*")
    .eq("aluno_id", aluno.id)
    .maybeSingle();

  const { data: bioimpedancias } = aluno.bioimpedancia_ativa
    ? await supabase
        .from("bioimpedancias")
        .select("*")
        .eq("aluno_id", aluno.id)
        .order("data", { ascending: false })
    : { data: [] };

  const bioChart = aluno.bioimpedancia_ativa ? await getGraficoBioimpedancia(aluno.id) : null;

  return (
    <div className="space-y-4">
      {aluno.anamnese_ativa && (
        <Card>
          <CardTitle className="mb-3">Anamnese</CardTitle>
          {anamnese?.concluida ? (
            <div className="space-y-2 text-sm">
              {Object.entries((anamnese.respostas ?? {}) as Record<string, string>)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs font-medium text-muted">{LABELS[k] ?? k}</p>
                    <p>{v}</p>
                  </div>
                ))}
              <p className="pt-1 text-xs text-muted">
                Preenchida em {formatDataBR(anamnese.data_preenchimento)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-warning">Aluno ainda não preencheu a anamnese.</p>
          )}
        </Card>
      )}

      {aluno.bioimpedancia_ativa && (
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <CardTitle>Bioimpedância</CardTitle>
            <details>
              <summary className="cursor-pointer list-none text-sm font-medium text-primary">
                + Novo registro
              </summary>
              <form
                action={registrarBioimpedancia}
                className="absolute right-4 z-10 mt-2 w-72 space-y-2 rounded-xl border border-border bg-surface p-3 shadow-lg"
              >
                <input type="hidden" name="alunoId" value={aluno.id} />
                <input
                  type="date"
                  name="data"
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="h-9 w-full rounded-lg border border-border px-2 text-sm"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input name="peso" type="number" step="0.1" placeholder="Peso (kg)" className="h-9 rounded-lg border border-border px-2 text-sm" />
                  <input name="percentual_gordura" type="number" step="0.1" placeholder="% gordura" className="h-9 rounded-lg border border-border px-2 text-sm" />
                  <input name="massa_magra" type="number" step="0.1" placeholder="Massa magra" className="h-9 rounded-lg border border-border px-2 text-sm" />
                  <input name="massa_ossea" type="number" step="0.1" placeholder="Massa óssea" className="h-9 rounded-lg border border-border px-2 text-sm" />
                  <input name="agua_corporal" type="number" step="0.1" placeholder="Água corporal %" className="h-9 col-span-2 rounded-lg border border-border px-2 text-sm" />
                </div>
                <Button type="submit" size="sm" className="w-full">
                  Salvar registro
                </Button>
              </form>
            </details>
          </div>

          {bioChart && bioChart.peso.length > 0 && (
            <div className="mb-3">
              <SimpleLineChart data={bioChart.peso} unidade="kg" />
            </div>
          )}

          <div className="space-y-2">
            {(bioimpedancias ?? []).map((b) => (
              <div key={b.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
                <span className="font-medium">{formatDataBR(b.data)}</span>
                <span className="text-muted">
                  {b.peso ?? "—"}kg · {b.percentual_gordura ?? "—"}% gordura
                </span>
              </div>
            ))}
            {(!bioimpedancias || bioimpedancias.length === 0) && (
              <p className="text-sm text-muted">Nenhum registro ainda.</p>
            )}
          </div>
        </Card>
      )}

      {!aluno.anamnese_ativa && !aluno.bioimpedancia_ativa && (
        <p className="text-sm text-muted">
          Nenhuma avaliação ativada para este aluno. Ative na ficha ou no convite.
        </p>
      )}
    </div>
  );
}
