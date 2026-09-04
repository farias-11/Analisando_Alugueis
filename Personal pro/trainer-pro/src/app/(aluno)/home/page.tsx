import { requireAluno } from "@/lib/data/current-user";
import {
  getAderenciaSemana,
  getAulasDoCiclo,
  getCicloAtivo,
  aulaDoDia,
  aulaConcluidaHoje,
} from "@/lib/data/aluno";
import { getResumoEvolucao, type ResumoEvolucao } from "@/lib/data/evolucao";
import { getGraficoPeso } from "@/lib/data/graficos";
import { corTendencia } from "@/lib/status";
import { Card, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { SetaTendencia } from "@/components/evolution-summary";
import { Check, CheckCircle2 } from "lucide-react";

// legenda abaixo dos círculos da meta semanal — regra simples baseada no
// progresso real da semana, sem IA (handoff da Home do aluno, seção 2.3)
function legendaMetaSemanal(concluidas: number, meta: number): string {
  if (meta <= 0) return "";
  if (concluidas >= meta) return "Meta da semana concluída! 🎉";
  if (concluidas === 0) return "Bora começar a semana!";
  if (concluidas / meta >= 0.6) return "Você está no caminho!";
  return "Ainda dá tempo de bater a meta.";
}

// Card de fechamento: uma frase por situação real do aluno, não uma genérica
// fixa — usa só o que o resumo de evolução já calcula (nada de dado novo).
// 15 ramos, do mais específico/urgente pro genérico, agrupados em 4 blocos:
// recência de treino → meta da semana → tendência de desempenho → genérico.
// Primeiro que bater, ganha (ordem importa). Reaproveita os mesmos limiares
// já usados em cargaTendencia/pesoTendencia/aderenciaTendencia (evolucao.ts)
// em vez de inventar número novo, pra não ter dois critérios divergentes
// pro mesmo dado.
function mensagemFechamento(
  concluidas: number,
  meta: number,
  resumo: ResumoEvolucao
): { emoji: string; texto: string } {
  const { diasDesdeUltimoTreino: dias, cargaTendencia, pesoTendencia, aderenciaTendencia, aderenciaPct } = resumo;
  const bateuMeta = meta > 0 && concluidas >= meta;

  // --- recência (mais urgente: há quanto tempo o aluno treinou de verdade) ---
  if (dias === null) {
    return { emoji: "🚀", texto: "Ainda não vimos seu primeiro treino por aqui — bora começar?" };
  }
  if (dias >= 14) {
    return { emoji: "📵", texto: "Faz muito tempo que você não aparece — está tudo bem?" };
  }
  if (dias >= 7) {
    return { emoji: "😴", texto: "Faz tempo que você não treina — que tal hoje?" };
  }
  if (dias >= 3) {
    return { emoji: "👋", texto: "Já faz uns dias desde o último treino — bora voltar?" };
  }

  // --- meta da semana (conquista concreta) ---
  if (dias === 0 && bateuMeta) {
    return { emoji: "🏆", texto: "Treino de hoje feito e meta batida — semana perfeita!" };
  }
  if (bateuMeta) {
    return { emoji: "💪", texto: "Você completou sua semana de treinos. Continue assim!" };
  }
  if (meta > 0 && concluidas === meta - 1) {
    return { emoji: "🎯", texto: "Só falta 1 treino pra fechar a semana com a meta batida!" };
  }

  // --- tendência de desempenho (carga, peso, aderência) ---
  if (aderenciaPct >= 90) {
    return { emoji: "⭐", texto: "Sua aderência está impecável — poucos chegam nesse nível!" };
  }
  if (cargaTendencia === "positiva") {
    return { emoji: "🔥", texto: "Sua carga está subindo — o esforço está valendo a pena!" };
  }
  if (cargaTendencia === "negativa") {
    return { emoji: "📉", texto: "Sua carga caiu um pouco — vale ajustar o descanso." };
  }
  if (pesoTendencia === "positiva") {
    return { emoji: "⚖️", texto: "Seu peso está indo na direção certa — continue assim." };
  }
  if (pesoTendencia === "negativa") {
    return { emoji: "🧭", texto: "Seu peso subiu essa semana — o foco é constância, não perfeição." };
  }
  if (aderenciaTendencia === "negativa") {
    return { emoji: "⏳", texto: "Essa semana ainda não decolou — dá pra recuperar o ritmo." };
  }

  // --- genérico ---
  if (meta > 0 && concluidas > 0) {
    return { emoji: "📈", texto: "Bom ritmo até aqui essa semana, continue assim!" };
  }
  return { emoji: "👍", texto: "Você está evoluindo! Continue assim." };
}

function qualificarAderencia(pct: number): string {
  if (pct >= 80) return "ótimo";
  if (pct >= 50) return "bom";
  return "atenção";
}

export default async function HomePage() {
  const { aluno } = await requireAluno();

  // ciclo ativo roda em paralelo com resumo/peso (não dependem dele); aulas
  // só dá pra buscar depois de saber o ciclo. aulaHoje e aderência da semana
  // usam as MESMAS aulas (uma query só, não duas) e rodam juntas.
  const [ciclo, resumo, pesoChart] = await Promise.all([
    getCicloAtivo(aluno.id),
    getResumoEvolucao(aluno.id),
    getGraficoPeso(aluno.id),
  ]);
  const aulas = ciclo ? await getAulasDoCiclo(ciclo.id) : [];
  const [aulaHoje, { concluidas, meta }] = await Promise.all([
    aulaDoDia(aluno.id, aulas),
    getAderenciaSemana(aluno.id, aulas),
  ]);
  const jaFezHoje = aulaHoje ? await aulaConcluidaHoje(aluno.id, aulaHoje.id) : false;

  const primeiroNome = aluno.nome.split(" ")[0];
  const horaServidor = new Date().getHours();
  const saudacao = horaServidor < 12 ? "Bom dia" : horaServidor < 18 ? "Boa tarde" : "Boa noite";
  const pesoAtual = pesoChart.length ? pesoChart[pesoChart.length - 1].valor : null;
  const fechamento = mensagemFechamento(concluidas, meta, resumo);

  return (
    // altura fixa = 100dvh menos o pb-24 (6rem) que o layout do aluno reserva
    // pra nav inferior fixa — sem isso a página cresce com o conteúdo e rola.
    // Próxima aula / Meta semanal / Seu progresso usam flex-1 com o conteúdo
    // centralizado: em celular alto sobra altura, e ela vira respiro dentro
    // desses 3 cards (em vez de um vão em branco no fim da tela). overflow-
    // hidden é a garantia final contra rolagem em aparelho pequeno demais.
    <div className="flex h-[calc(100dvh-6rem)] flex-col gap-2.5 overflow-hidden px-4 pb-1.5 pt-3.5">
      <div className="shrink-0">
        <p className="text-xs text-muted">{saudacao},</p>
        <h1 className="text-xl font-bold leading-tight">{primeiroNome}! 👋</h1>
      </div>

      <Card
        className={`flex flex-1 flex-col justify-center p-4 ${jaFezHoje ? "bg-success text-white" : "bg-primary text-white"}`}
      >
        {aulaHoje && jaFezHoje ? (
          <>
            <p className="flex items-center gap-1.5 text-xs font-medium text-white/80">
              <CheckCircle2 size={14} /> Treino de hoje
            </p>
            <p className="mt-1 text-lg font-bold">{aulaHoje.nome} concluído! 🎉</p>
            <ButtonLink
              href={`/treino/${aulaHoje.id}`}
              size="sm"
              variant="secondary"
              className="mt-3 w-full bg-white text-success hover:bg-white/90"
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
              size="sm"
              variant="secondary"
              className="mt-3 w-full bg-white text-primary-dark hover:bg-white/90"
            >
              Começar treino
            </ButtonLink>
          </>
        ) : ciclo ? (
          <>
            <p className="text-xs font-medium text-white/80">Próxima aula</p>
            <p className="mt-1.5 text-sm text-white/90">Hoje é dia de descanso. 💪</p>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-white/80">Próxima aula</p>
            <p className="mt-1.5 text-sm text-white/90">
              Nenhum treino ativo no momento. Fale com seu personal.
            </p>
          </>
        )}
      </Card>

      <Card className="flex flex-1 flex-col justify-center p-4">
        <div className="flex items-center justify-between">
          <CardTitle>Meta semanal</CardTitle>
          <span className="text-xs font-semibold text-muted">
            {concluidas} de {meta || "—"} treinos
          </span>
        </div>
        {meta > 0 && (
          <>
            <div className="mt-3 flex gap-2">
              {Array.from({ length: meta }, (_, i) => i < concluidas).map((feito, i) => (
                <div
                  key={i}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    feito ? "bg-primary text-white" : "border-2 border-border text-border"
                  }`}
                >
                  {feito && <Check size={16} strokeWidth={3} />}
                </div>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-muted">{legendaMetaSemanal(concluidas, meta)}</p>
          </>
        )}
      </Card>

      <Card className="flex flex-1 flex-col justify-center p-4">
        <CardTitle className="mb-2.5">Seu progresso</CardTitle>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-neutral-soft p-2.5 text-center">
            <p className="text-[11px] text-muted">Peso</p>
            <p className="text-sm font-bold">{pesoAtual !== null ? `${pesoAtual}kg` : "—"}</p>
            {resumo.pesoDeltaKg !== null && (
              <p className={`flex items-center justify-center gap-0.5 text-[11px] ${corTendencia(resumo.pesoTendencia).text}`}>
                <SetaTendencia tendencia={resumo.pesoTendencia} />
                {Math.abs(resumo.pesoDeltaKg).toFixed(1)}kg
              </p>
            )}
          </div>
          <div className="rounded-xl bg-neutral-soft p-2.5 text-center">
            <p className="text-[11px] text-muted">Carga média</p>
            <p className="text-sm font-bold">
              {resumo.cargaDeltaPct === null ? "—" : `${resumo.cargaDeltaPct > 0 ? "+" : ""}${resumo.cargaDeltaPct.toFixed(0)}%`}
            </p>
            <p className="text-[11px] text-muted">30d</p>
          </div>
          <div className="rounded-xl bg-neutral-soft p-2.5 text-center">
            <p className="text-[11px] text-muted">Aderência</p>
            <p className="text-sm font-bold">{resumo.aderenciaPct}%</p>
            <p className="text-[11px] text-muted">{qualificarAderencia(resumo.aderenciaPct)}</p>
          </div>
        </div>
      </Card>

      <Card className="shrink-0 bg-primary-soft p-3">
        <p className="flex items-start gap-2 text-xs font-medium leading-snug text-foreground">
          <span>{fechamento.emoji}</span>
          {fechamento.texto}
        </p>
      </Card>
    </div>
  );
}
