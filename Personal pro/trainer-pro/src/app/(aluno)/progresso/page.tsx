import { requireAluno } from "@/lib/data/current-user";
import { getResumoEvolucao } from "@/lib/data/evolucao";
import { getGraficoBioimpedancia, getGraficoCargaPrincipal, getGraficoPeso } from "@/lib/data/graficos";
import { TopBar } from "@/components/nav/top-bar";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { EvolutionSummary } from "@/components/evolution-summary";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";

export default async function MeuProgressoPage() {
  const { aluno } = await requireAluno();

  const [resumo, pesoChart, cargaChart, bioChart] = await Promise.all([
    getResumoEvolucao(aluno.id),
    getGraficoPeso(aluno.id),
    getGraficoCargaPrincipal(aluno.id),
    aluno.bioimpedancia_ativa ? getGraficoBioimpedancia(aluno.id) : Promise.resolve(null),
  ]);

  return (
    <div>
      <TopBar title="Meu progresso" />
      <div className="space-y-4 p-4">
        <Card>
          <CardTitle className="mb-3">Resumo · 30 dias</CardTitle>
          <EvolutionSummary resumo={resumo} />
        </Card>

        <Card>
          <CardTitle>Evolução de peso corporal</CardTitle>
          <CardSubtitle className="mb-2">Lançado por você em &quot;Minhas medidas&quot;</CardSubtitle>
          <SimpleLineChart data={pesoChart} unidade="kg" />
        </Card>

        {cargaChart && (
          <Card>
            <CardTitle>Evolução de carga</CardTitle>
            <CardSubtitle className="mb-2">{cargaChart.exercicioNome}</CardSubtitle>
            <SimpleLineChart data={cargaChart.pontos} color="var(--success)" unidade="kg" tendenciaDelta="maior_melhor" />
            {(() => {
              const pontos = cargaChart.pontos;
              if (pontos.length < 2) return null;
              const primeiro = pontos[0].valor;
              const ultimo = pontos[pontos.length - 1].valor;
              if (primeiro <= 0) return null;
              const variacao = Math.round(((ultimo - primeiro) / primeiro) * 100);
              if (variacao === 0) return null;
              return (
                <p className="mt-3 text-sm text-foreground/90">
                  {variacao > 0 ? "📈" : "📉"} Sua carga em {cargaChart.exercicioNome}{" "}
                  {variacao > 0 ? "subiu" : "caiu"} <strong>{Math.abs(variacao)}%</strong> nesse período.
                </p>
              );
            })()}
          </Card>
        )}

        {aluno.bioimpedancia_ativa && bioChart && (
          <Card>
            <CardTitle>Bioimpedância</CardTitle>
            <CardSubtitle className="mb-2">Somente leitura — lançada pelo seu personal</CardSubtitle>
            <p className="mb-1 text-xs font-medium text-muted">Peso</p>
            <SimpleLineChart data={bioChart.peso} unidade="kg" />
            <p className="mb-1 mt-3 text-xs font-medium text-muted">% de gordura</p>
            <SimpleLineChart data={bioChart.percentualGordura} color="var(--warning)" unidade="%" />
          </Card>
        )}
      </div>
    </div>
  );
}
