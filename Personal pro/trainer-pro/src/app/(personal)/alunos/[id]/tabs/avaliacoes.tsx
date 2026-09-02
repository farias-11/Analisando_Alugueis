import { createClient } from "@/lib/supabase/server";
import { getGraficoBioimpedancia } from "@/lib/data/graficos";
import { Card, CardTitle } from "@/components/ui/card";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { Button } from "@/components/ui/button";
import { registrarBioimpedancia } from "@/app/actions/bioimpedancia";
import { formatDataBR } from "@/lib/status";
import { ShieldOff } from "lucide-react";
import type { Aluno } from "@/lib/types";

type Respostas = Record<string, string | string[] | undefined>;

const SELECT_LABELS: Record<string, Record<string, string>> = {
  nivel_atividade: { sedentario: "Sedentário", leve: "Leve", moderado: "Moderado", intenso: "Intenso" },
  fumante: { nao: "Não", sim: "Sim", ex_fumante: "Ex-fumante" },
  alcool: { nao: "Não bebe", social: "Socialmente", frequente: "Frequentemente" },
  sono: { boa: "Boa", regular: "Regular", ruim: "Ruim" },
  estresse: { baixo: "Baixo", medio: "Médio", alto: "Alto" },
  objetivo_principal: {
    emagrecimento: "Emagrecimento",
    hipertrofia: "Hipertrofia",
    condicionamento: "Condicionamento",
    saude_geral: "Saúde geral",
  },
  experiencia_previa: {
    nenhuma: "Nenhuma",
    menos_6_meses: "Menos de 6 meses",
    "6_meses_2_anos": "De 6 meses a 2 anos",
    mais_2_anos: "Mais de 2 anos",
  },
};

function texto(r: Respostas, campo: string): string {
  const v = r[campo];
  if (Array.isArray(v)) return v.join(", ") || "—";
  return SELECT_LABELS[campo]?.[v ?? ""] ?? v ?? "—";
}

function linhaSimNao(r: Respostas, campoSim: string, campoDetalhe: string, campoTipos?: string): string {
  const sim = r[campoSim] === "sim";
  if (!sim) return "Não";
  const tipos = campoTipos ? r[campoTipos] : undefined;
  const detalhe = r[campoDetalhe];
  const partes = [
    Array.isArray(tipos) && tipos.length ? tipos.join(", ") : null,
    typeof detalhe === "string" && detalhe ? detalhe : null,
  ].filter(Boolean);
  return partes.length ? `Sim — ${partes.join(" · ")}` : "Sim";
}

function montarLinhas(r: Respostas) {
  return [
    { label: "Idade", valor: texto(r, "idade") },
    { label: "Profissão", valor: texto(r, "profissao") },
    { label: "Nível de atividade", valor: texto(r, "nivel_atividade") },
    { label: "Doenças diagnosticadas", valor: [texto(r, "doencas"), r.doencas_outra].filter(Boolean).join(" · ") || "—" },
    { label: "Usa medicamento contínuo?", valor: linhaSimNao(r, "medicamentos_usa", "medicamentos_detalhe", "medicamentos_tipos") },
    { label: "Já fez cirurgia?", valor: linhaSimNao(r, "cirurgias_teve", "cirurgias_detalhe", "cirurgias_tipos") },
    { label: "Lesões/dores", valor: [texto(r, "lesoes_dores"), r.lesoes_dores_outra].filter(Boolean).join(" · ") || "—" },
    { label: "Já fez fisioterapia?", valor: linhaSimNao(r, "fisioterapia_fez", "fisioterapia_detalhe", "fisioterapia_tipos") },
    { label: "Fumante", valor: texto(r, "fumante") },
    { label: "Álcool", valor: texto(r, "alcool") },
    { label: "Sono", valor: texto(r, "sono") },
    { label: "Estresse", valor: texto(r, "estresse") },
    { label: "Objetivo principal", valor: texto(r, "objetivo_principal") },
    {
      label: "Experiência prévia",
      valor: [texto(r, "experiencia_previa"), r.experiencia_previa_detalhe].filter(Boolean).join(" — ") || "—",
    },
    { label: "Observações", valor: texto(r, "observacoes") },
  ].filter((l) => l.valor && l.valor !== "—" && l.valor !== "Não");
}

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
      {!aluno.consentimento_saude_aceito && (
        <Card className="flex items-center gap-2 border-warning/30 bg-warning-soft">
          <ShieldOff size={16} className="shrink-0 text-warning" />
          <p className="text-sm text-warning">
            Este aluno revogou o consentimento de dados de saúde — anamnese, medidas e fotos ficam
            ocultas até ele consentir de novo pela tela &quot;Meus dados&quot;.
          </p>
        </Card>
      )}
      {aluno.anamnese_ativa && (
        <Card>
          <CardTitle className="mb-3">Anamnese</CardTitle>
          {anamnese?.concluida ? (
            <div className="space-y-2 text-sm">
              {montarLinhas((anamnese.respostas ?? {}) as Respostas).map((l) => (
                <div key={l.label}>
                  <p className="text-xs font-medium text-muted">{l.label}</p>
                  <p>{l.valor}</p>
                </div>
              ))}
              <p className="pt-1 text-xs text-muted">
                Última atualização em {formatDataBR(anamnese.data_preenchimento)}
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
