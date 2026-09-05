import { requireAluno } from "@/lib/data/current-user";
import { getAderenciaSemana, getAulasDoCiclo, getCicloAtivo, aulaDoDia } from "@/lib/data/aluno";
import { getResumoEvolucao, type ResumoEvolucao } from "@/lib/data/evolucao";
import { getGraficoPeso } from "@/lib/data/graficos";
import { saudacaoPorHorario, type Tendencia } from "@/lib/status";
import { Card, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { ViewportFit } from "./viewport-fit";
import { Check, CheckCircle2, Dumbbell, Minus, Play, TrendingDown, TrendingUp } from "lucide-react";

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

function qualificarAderencia(pct: number): { label: string; tendencia: Tendencia } {
  if (pct >= 80) return { label: "ótimo", tendencia: "positiva" };
  if (pct >= 50) return { label: "bom", tendencia: "neutra" };
  return { label: "atenção", tendencia: "negativa" };
}

// mesma palavra de qualificação usada em aderência, mas a partir da
// Tendencia já calculada (peso/carga) — um único vocabulário pro cartão
// inteiro em vez de "positiva/negativa" cru.
function qualificarTendencia(t: Tendencia): string {
  if (t === "positiva") return "ótimo";
  if (t === "negativa") return "atenção";
  return "bom";
}

function corTexto(t: Tendencia): string {
  if (t === "positiva") return "text-success";
  if (t === "negativa") return "text-danger";
  return "text-warning";
}

// setinha discreta indicando se o valor subiu, desceu ou ficou igual — a
// direção vem do sinal real do delta (ou da Tendencia, quando não há delta
// numérico, como aderência); a cor do ícone é sempre âmbar, só a palavra
// de qualificação ao lado que muda de verde/âmbar/vermelho.
function IconeDirecao({ delta }: { delta: number }) {
  if (delta > 0) return <TrendingUp size={12} className="text-warning" />;
  if (delta < 0) return <TrendingDown size={12} className="text-warning" />;
  return <Minus size={12} className="text-warning" />;
}

// pra aderência não há delta numérico exposto, só a tendência (resumo.aderenciaTendencia)
function direcaoPorTendencia(t: Tendencia): number {
  if (t === "positiva") return 1;
  if (t === "negativa") return -1;
  return 0;
}

export default async function HomePage() {
  const { aluno } = await requireAluno();

  // ciclo ativo roda em paralelo com resumo/peso (não dependem dele); aulas
  // só dá pra buscar depois de saber o ciclo. aulaHoje e aderência da semana
  // usam as MESMAS aulas (uma query só, não duas) e rodam juntas — e
  // "aulasFeitasHojeIds" (dentro de getAderenciaSemana) já resolve "o aluno
  // fez o treino de hoje?" sem outra ida ao banco depois (era um 3º estágio
  // sequencial antes, aulaConcluidaHoje, removido).
  const [ciclo, resumo, pesoChart] = await Promise.all([
    getCicloAtivo(aluno.id),
    getResumoEvolucao(aluno.id),
    getGraficoPeso(aluno.id),
  ]);
  const aulas = ciclo ? await getAulasDoCiclo(ciclo.id) : [];
  const [aulaHoje, { concluidas, meta, aulasFeitasHojeIds }] = await Promise.all([
    aulaDoDia(aluno.id, aulas),
    getAderenciaSemana(aluno.id, aulas),
  ]);
  const jaFezHoje = aulaHoje ? aulasFeitasHojeIds.has(aulaHoje.id) : false;

  const primeiroNome = aluno.nome.split(" ")[0];
  const saudacao = saudacaoPorHorario();
  const pesoAtual = pesoChart.length ? pesoChart[pesoChart.length - 1].valor : null;
  const fechamento = mensagemFechamento(concluidas, meta, resumo);

  return (
    // ViewportFit mede a altura disponível de verdade em JS (visualViewport
    // + altura real da nav inferior renderizada) em vez de depender de
    // unidade de viewport do CSS — vh/dvh/svh se mostraram inconsistentes no
    // Safari real do iPhone (calculam como se a barra do navegador já
    // estivesse escondida, mesmo visível). Todo o resto (fonte, círculos,
    // padding) escala a partir desse mesmo número medido — ver viewport-fit.tsx.
    <ViewportFit
      header={
        <div>
          <p className="text-[var(--fs-tiny)] leading-none text-muted">{saudacao},</p>
          <h1 className="mt-0.5 truncate pr-10 text-[var(--fs-name)] font-bold leading-none">{primeiroNome}! 👋</h1>
        </div>
      }
    >
      {/* Em telas largas (md+), próxima aula e meta semanal ficam lado a
          lado — no celular continuam empilhadas normalmente. Nenhum card
          "estica" pra preencher sobra (isso já causou card gigante com
          conteúdo minúsculo dentro, em mais de uma rodada) — todos ficam no
          tamanho natural, igual a referência de design; a sobra vira uma
          margem pequena e centralizada (ver justify-center no ViewportFit). */}
      <div className="flex flex-col md:grid md:grid-cols-2 md:items-stretch md:gap-4">
      <Card
        style={{ padding: "var(--pad-card)", marginBottom: "var(--gap-card)" }}
        className={`relative flex shrink-0 flex-col justify-center md:flex-1 ${jaFezHoje ? "bg-success text-white" : "bg-primary text-white"}`}
      >
        <Dumbbell size={22} strokeWidth={1.75} className="absolute right-4 top-4 text-white/35" />
        {aulaHoje && jaFezHoje ? (
          <>
            <p className="flex items-center gap-1.5 text-[var(--fs-tiny)] font-semibold uppercase tracking-wide text-white/80">
              <CheckCircle2 size={14} /> Treino de hoje
            </p>
            <p className="mt-1 max-w-[85%] text-[var(--fs-hero)] font-bold leading-tight">
              {aulaHoje.nome} concluído! 🎉
            </p>
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
            <p className="text-[var(--fs-tiny)] font-semibold uppercase tracking-wide text-white/80">Próxima aula</p>
            <p className="mt-1 max-w-[85%] text-[var(--fs-hero)] font-bold leading-tight">{aulaHoje.nome}</p>
            <p className="mt-0.5 text-[var(--fs-tiny)] text-white/80">
              Hoje{aulaHoje.duracao_estimada_min ? ` • ~${aulaHoje.duracao_estimada_min} min` : ""}
            </p>
            <ButtonLink
              href={`/treino`}
              size="sm"
              variant="secondary"
              className="mt-3 w-full bg-white text-primary-dark hover:bg-white/90"
            >
              <Play size={14} className="fill-current" /> Começar treino
            </ButtonLink>
          </>
        ) : ciclo ? (
          <>
            <p className="text-[var(--fs-tiny)] font-semibold uppercase tracking-wide text-white/80">Próxima aula</p>
            <p className="mt-1.5 text-[var(--fs-num)] text-white/90">Hoje é dia de descanso. 💪</p>
          </>
        ) : (
          <>
            <p className="text-[var(--fs-tiny)] font-semibold uppercase tracking-wide text-white/80">Próxima aula</p>
            <p className="mt-1.5 text-[var(--fs-num)] text-white/90">
              Nenhum treino ativo no momento. Fale com seu personal.
            </p>
          </>
        )}
      </Card>

      <Card
        style={{ padding: "var(--pad-card)", marginBottom: "var(--gap-card)" }}
        className="flex shrink-0 flex-col justify-center md:flex-1"
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-[var(--fs-label)]">Meta semanal</CardTitle>
          <span className="text-[var(--fs-tiny)] font-semibold text-muted">
            {concluidas} de {meta || "—"} treinos
          </span>
        </div>
        {meta > 0 && (
          <>
            <div className="mt-3 flex justify-center gap-2">
              {Array.from({ length: meta }, (_, i) => i < concluidas).map((feito, i) => (
                <div
                  key={i}
                  style={{ height: "var(--circle)", width: "var(--circle)" }}
                  className={`flex shrink-0 items-center justify-center rounded-full ${
                    feito ? "bg-primary text-white" : "border-2 border-border text-border"
                  }`}
                >
                  {feito && <Check size={18} strokeWidth={3} />}
                </div>
              ))}
            </div>
            <p className="mt-2 text-[var(--fs-tiny)] text-muted">{legendaMetaSemanal(concluidas, meta)}</p>
          </>
        )}
      </Card>
      </div>

      <Card
        style={{ padding: "var(--pad-card)", marginBottom: "var(--gap-card)" }}
        className="flex shrink-0 flex-col justify-center md:flex-1"
      >
        <CardTitle className="mb-2 text-[var(--fs-label)]">Seu progresso</CardTitle>
        <div className="grid grid-cols-3 gap-2">
          <div style={{ padding: "var(--pad-inner)" }} className="rounded-xl bg-neutral-soft text-center">
            <p className="whitespace-nowrap text-[var(--fs-tiny)] text-muted">Peso</p>
            <p className="text-[var(--fs-num)] font-bold">{pesoAtual !== null ? `${pesoAtual}kg` : "—"}</p>
            {resumo.pesoDeltaKg !== null ? (
              <p className="flex items-center justify-center gap-1 whitespace-nowrap text-[var(--fs-tiny)]">
                <IconeDirecao delta={resumo.pesoDeltaKg} />
                <span className={corTexto(resumo.pesoTendencia)}>{qualificarTendencia(resumo.pesoTendencia)}</span>
              </p>
            ) : (
              <p className="whitespace-nowrap text-[var(--fs-tiny)] text-muted">30d</p>
            )}
          </div>
          <div style={{ padding: "var(--pad-inner)" }} className="rounded-xl bg-neutral-soft text-center">
            <p className="whitespace-nowrap text-[var(--fs-tiny)] text-muted">Carga</p>
            <p className="text-[var(--fs-num)] font-bold">
              {resumo.cargaDeltaPct === null ? "—" : `${resumo.cargaDeltaPct > 0 ? "+" : ""}${resumo.cargaDeltaPct.toFixed(0)}%`}
            </p>
            {resumo.cargaDeltaPct !== null ? (
              <p className="flex items-center justify-center gap-1 whitespace-nowrap text-[var(--fs-tiny)]">
                <IconeDirecao delta={resumo.cargaDeltaPct} />
                <span className={corTexto(resumo.cargaTendencia)}>{qualificarTendencia(resumo.cargaTendencia)}</span>
              </p>
            ) : (
              <p className="whitespace-nowrap text-[var(--fs-tiny)] text-muted">30d</p>
            )}
          </div>
          <div style={{ padding: "var(--pad-inner)" }} className="rounded-xl bg-neutral-soft text-center">
            <p className="whitespace-nowrap text-[var(--fs-tiny)] text-muted">Aderência</p>
            <p className="text-[var(--fs-num)] font-bold">{resumo.aderenciaPct}%</p>
            <p className="flex items-center justify-center gap-1 whitespace-nowrap text-[var(--fs-tiny)]">
              <IconeDirecao delta={direcaoPorTendencia(resumo.aderenciaTendencia)} />
              <span className={corTexto(qualificarAderencia(resumo.aderenciaPct).tendencia)}>
                {qualificarAderencia(resumo.aderenciaPct).label}
              </span>
            </p>
          </div>
        </div>
      </Card>

      <Card
        style={{ padding: "var(--pad-card)" }}
        className="flex shrink-0 flex-col justify-center bg-primary-soft md:flex-1"
      >
        <p className="flex items-start gap-2 text-[var(--fs-num)] font-medium leading-snug text-foreground">
          <span>{fechamento.emoji}</span>
          {fechamento.texto}
        </p>
      </Card>
    </ViewportFit>
  );
}
