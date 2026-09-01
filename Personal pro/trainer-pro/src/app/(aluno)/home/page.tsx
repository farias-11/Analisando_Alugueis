import { requireAluno } from "@/lib/data/current-user";
import {
  getAderenciaSemana,
  getAulasDoCiclo,
  getCicloAtivo,
  aulaDoDia,
  aulaConcluidaHoje,
} from "@/lib/data/aluno";
import { getResumoEvolucao } from "@/lib/data/evolucao";
import { createClient } from "@/lib/supabase/server";
import { diasDesde } from "@/lib/status";
import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EvolutionSummary } from "@/components/evolution-summary";
import { AlertTriangle, CheckCircle2, ChevronRight, Flame } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  const ciclo = await getCicloAtivo(aluno.id);
  const aulas = ciclo ? await getAulasDoCiclo(ciclo.id) : [];
  const aulaHoje = await aulaDoDia(aluno.id, aulas);
  const jaFezHoje = aulaHoje ? await aulaConcluidaHoje(aluno.id, aulaHoje.id) : false;
  const { concluidas, meta } = await getAderenciaSemana(aluno.id);
  const resumo = await getResumoEvolucao(aluno.id);

  const pendencias: { texto: string; href: string }[] = [];
  const diasSemMedidas = diasDesde(aluno.ultima_atualizacao_medidas);
  if (diasSemMedidas === null || diasSemMedidas > 14) {
    pendencias.push({ texto: "Insira suas medidas", href: "/medidas" });
  }
  if (aluno.anamnese_ativa) {
    const { data: anamnese } = await supabase
      .from("anamneses")
      .select("concluida")
      .eq("aluno_id", aluno.id)
      .maybeSingle();
    if (!anamnese?.concluida) {
      pendencias.push({ texto: "Preencha sua anamnese", href: "/anamnese" });
    }
  }

  const primeiroNome = aluno.nome.split(" ")[0];
  const metaPct = meta > 0 ? Math.round((concluidas / meta) * 100) : 0;

  return (
    <div className="space-y-5 px-4 pb-4 pt-6">
      <div>
        <p className="text-sm text-muted">Olá,</p>
        <h1 className="text-2xl font-bold">{primeiroNome}!</h1>
      </div>

      <Card className={jaFezHoje ? "bg-success text-white" : "bg-primary text-white"}>
        {aulaHoje && jaFezHoje ? (
          <>
            <p className="flex items-center gap-1.5 text-xs font-medium text-white/80">
              <CheckCircle2 size={14} /> Treino de hoje
            </p>
            <p className="mt-1 text-lg font-bold">{aulaHoje.nome} concluído! 🎉</p>
            <ButtonLink
              href={`/treino/${aulaHoje.id}`}
              variant="secondary"
              className="mt-4 w-full bg-white text-success hover:bg-white/90"
            >
              Rever treino
            </ButtonLink>
          </>
        ) : aulaHoje ? (
          <>
            <p className="text-xs font-medium text-white/80">Próxima aula</p>
            <p className="mt-1 text-lg font-bold">{aulaHoje.nome}</p>
            {aulaHoje.duracao_estimada_min ? (
              <p className="text-xs text-white/80">~{aulaHoje.duracao_estimada_min} min</p>
            ) : null}
            <ButtonLink
              href={`/treino`}
              variant="secondary"
              className="mt-4 w-full bg-white text-primary-dark hover:bg-white/90"
            >
              Começar treino
            </ButtonLink>
          </>
        ) : ciclo ? (
          <>
            <p className="text-xs font-medium text-white/80">Próxima aula</p>
            <p className="mt-2 text-sm text-white/90">Hoje é dia de descanso. 💪</p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-white/80">Próxima aula</p>
            <p className="mt-2 text-sm text-white/90">
              Nenhum treino ativo no momento. Fale com seu personal.
            </p>
          </>
        )}
      </Card>

      {pendencias.length > 0 && (
        <div className="space-y-2">
          {pendencias.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="flex items-center justify-between rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3 text-sm font-medium text-warning"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} />
                {p.texto}
              </span>
              <ChevronRight size={16} />
            </Link>
          ))}
        </div>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Meta semanal</CardTitle>
            <CardSubtitle>
              {concluidas} de {meta || "—"} treinos
            </CardSubtitle>
          </div>
          <div className="flex items-center gap-1 text-primary">
            <Flame size={16} />
            <span className="text-sm font-bold">{metaPct}%</span>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-pill bg-neutral-soft">
          <div
            className="h-full rounded-pill bg-primary transition-all"
            style={{ width: `${Math.min(metaPct, 100)}%` }}
          />
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">Seu progresso</CardTitle>
        <EvolutionSummary resumo={resumo} />
      </Card>
    </div>
  );
}
