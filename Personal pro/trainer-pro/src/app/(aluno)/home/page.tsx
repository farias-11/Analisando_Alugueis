import type { ReactNode } from "react";
import { requireAluno } from "@/lib/data/current-user";
import {
  getAderenciaSemana,
  getAulasDoCiclo,
  getCicloAtivo,
  aulaDoDia,
  getStatusExerciciosAulaHoje,
} from "@/lib/data/aluno";
import { getResumoEvolucao, type ResumoEvolucao } from "@/lib/data/evolucao";
import { getGraficoPeso } from "@/lib/data/graficos";
import { saudacaoPorHorario, type Tendencia } from "@/lib/status";
import { Card, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { ViewportFit } from "./viewport-fit";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Minus,
  Scale,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

// Anel de progresso da meta semanal — substitui a fileira de bolinhas
// (não dava pra ver "quanto falta" de relance, só contar uma por uma).
// Raio 42 sobre viewBox 100x100 é só a unidade do desenho (não px de tela
// nenhum) — o tamanho real vem do --ring (viewport-fit.tsx, mesma escala
// que --circle usava). -rotate-90 faz o traço começar no topo (12h) em vez
// do padrão do SVG (3h).
function AnelMetaSemanal({ concluidas, meta }: { concluidas: number; meta: number }) {
  const raio = 42;
  const perimetro = 2 * Math.PI * raio;
  const fracao = meta > 0 ? Math.min(1, concluidas / meta) : 0;
  const bateuMeta = meta > 0 && concluidas >= meta;

  return (
    <div className="relative shrink-0" style={{ width: "var(--ring)", height: "var(--ring)" }}>
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={raio} fill="none" strokeWidth="10" className="text-neutral-soft" stroke="currentColor" />
        <circle
          cx="50"
          cy="50"
          r={raio}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke="currentColor"
          className={bateuMeta ? "text-success" : "text-primary"}
          strokeDasharray={perimetro}
          strokeDashoffset={perimetro * (1 - fracao)}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[var(--fs-num)] font-bold leading-none">
          {concluidas}/{meta}
        </span>
      </div>
    </div>
  );
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
): { emoji: string; texto: string; sub: string } {
  const { diasDesdeUltimoTreino: dias, cargaTendencia, pesoTendencia, aderenciaTendencia, aderenciaPct } = resumo;
  const bateuMeta = meta > 0 && concluidas >= meta;

  // --- recência (mais urgente: há quanto tempo o aluno treinou de verdade) ---
  if (dias === null) {
    return { emoji: "🚀", texto: "Ainda não vimos seu primeiro treino por aqui — bora começar?", sub: "É só abrir o treino de hoje e seguir o passo a passo." };
  }
  if (dias >= 14) {
    return { emoji: "📵", texto: "Faz muito tempo que você não aparece — está tudo bem?", sub: "Qualquer coisa, fala com seu personal." };
  }
  if (dias >= 7) {
    return { emoji: "😴", texto: "Faz tempo que você não treina — que tal hoje?", sub: "Um treino já ajuda a retomar o ritmo." };
  }
  if (dias >= 3) {
    return { emoji: "👋", texto: "Já faz uns dias desde o último treino — bora voltar?", sub: "Você está quase lá. Bora manter o ritmo!" };
  }

  // --- meta da semana (conquista concreta) ---
  if (dias === 0 && bateuMeta) {
    return { emoji: "🏆", texto: "Treino de hoje feito e meta batida — semana perfeita!", sub: "Aproveite pra descansar — a semana que vem começa do zero." };
  }
  if (bateuMeta) {
    return { emoji: "💪", texto: "Você completou sua semana de treinos. Continue assim!", sub: "Sua constância está dando resultado." };
  }
  if (meta > 0 && concluidas === meta - 1) {
    return { emoji: "🎯", texto: "Só falta 1 treino pra fechar a semana com a meta batida!", sub: "Você está quase lá. Bora manter o ritmo!" };
  }

  // --- tendência de desempenho (carga, peso, aderência) ---
  if (aderenciaPct >= 90) {
    return { emoji: "⭐", texto: "Sua aderência está impecável — poucos chegam nesse nível!", sub: "Continue assim que os resultados vêm." };
  }
  if (cargaTendencia === "positiva") {
    return { emoji: "🔥", texto: "Sua carga está subindo — o esforço está valendo a pena!", sub: "Continue assim que os resultados vêm." };
  }
  if (cargaTendencia === "negativa") {
    return { emoji: "📉", texto: "Sua carga caiu um pouco — vale ajustar o descanso.", sub: "Conversa com seu personal se persistir." };
  }
  if (pesoTendencia === "positiva") {
    return { emoji: "⚖️", texto: "Seu peso está indo na direção certa — continue assim.", sub: "Sua constância está dando resultado." };
  }
  if (pesoTendencia === "negativa") {
    return { emoji: "🧭", texto: "Seu peso subiu essa semana — o foco é constância, não perfeição.", sub: "Um ajuste de rota, não um problema." };
  }
  if (aderenciaTendencia === "negativa") {
    return { emoji: "⏳", texto: "Essa semana ainda não decolou — dá pra recuperar o ritmo.", sub: "Você está quase lá. Bora manter o ritmo!" };
  }

  // --- genérico ---
  if (meta > 0 && concluidas > 0) {
    return { emoji: "📈", texto: "Bom ritmo até aqui essa semana, continue assim!", sub: "Sua constância está dando resultado." };
  }
  return { emoji: "👍", texto: "Você está evoluindo! Continue assim.", sub: "Sua constância está dando resultado." };
}

// Linha fixa sob a saudação (pedido do design: contexto sempre visível, sem
// precisar interpretar o banner de baixo) — só o FATO ("faz X dias"), nunca
// um incentivo/julgamento (isso já é papel do banner de fechamento, que tem
// 15 variações pra isso). null (nunca treinou) e dias=0 (treinou hoje) ficam
// sem linha: o card "Próxima aula" já cobre os dois casos.
function subtituloUltimoTreino(dias: number | null): string | null {
  if (dias === null || dias === 0) return null;
  return dias === 1 ? "Você está há 1 dia do seu último treino." : `Você está há ${dias} dias do seu último treino.`;
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

// "atenção"/"ótimo" ganham um chip colorido (Pill), igual ao design de
// referência — antes era só a palavra colorida, sem fundo.
function toneTendencia(t: Tendencia): "success" | "warning" | "danger" {
  if (t === "positiva") return "success";
  if (t === "negativa") return "danger";
  return "warning";
}

// setinha discreta indicando se o valor subiu, desceu ou ficou igual — no
// desktop (fora do Pill) a cor é sempre âmbar, só a palavra de qualificação
// ao lado que muda de cor; dentro do Pill do celular (que já tem fundo e
// texto coloridos) "currentColor" deixa a seta com a MESMA cor do chip, em
// vez de brigar com ela.
function IconeDirecao({ delta, className = "text-warning" }: { delta: number; className?: string }) {
  if (delta > 0) return <TrendingUp size={12} className={className} />;
  if (delta < 0) return <TrendingDown size={12} className={className} />;
  return <Minus size={12} className={className} />;
}

// pra aderência não há delta numérico exposto, só a tendência (resumo.aderenciaTendencia)
function direcaoPorTendencia(t: Tendencia): number {
  if (t === "positiva") return 1;
  if (t === "negativa") return -1;
  return 0;
}

// selo circular com o ícone da métrica — mesmo visual nas duas variantes
// (linha do mobile e caixa do desktop) abaixo.
function IconeMetrica({ icon: Icon }: { icon: typeof Scale }) {
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary md:h-6 md:w-6">
      <Icon size={11} strokeWidth={2} className="md:hidden" />
      <Icon size={13} strokeWidth={2} className="hidden md:block" />
    </div>
  );
}

// Linha de UMA LINHA SÓ (ícone+rótulo à esquerda, valor+tendência à direita)
// — usada só no celular. A Home mobile tem regra dura de NUNCA rolar (ver
// viewport-fit.tsx): uma versão com rótulo/valor empilhados em 2 linhas por
// métrica (3 métricas = 6 linhas) não coube em nenhum teste; nessa versão de
// 1 linha por métrica o bloco inteiro fica do tamanho que o grid antigo já
// ocupava. "delta" aqui é só a DIREÇÃO (positivo/negativo/zero) pro ícone de
// seta — qualificarTendencia já traduz isso pra "ótimo/bom/atenção" com a
// cor certa.
function LinhaProgresso({
  icon,
  label,
  valor,
  delta,
  deltaTexto,
  tendencia,
  legendaSemDelta,
}: {
  icon: typeof Scale;
  label: string;
  valor: string;
  delta: number | null;
  /** magnitude formatada da variação (ex: "+0.8kg") — só existe pra Peso,
   * onde temos um valor ATUAL (85kg) e uma variação de verdade separada.
   * Carga e Aderência não têm os dois números (a "variação" delas JÁ É o
   * valor principal mostrado) — mostrar de novo ali seria repetir o mesmo
   * número, não uma segunda informação real. */
  deltaTexto?: string;
  tendencia: Tendencia;
  legendaSemDelta?: string;
}) {
  return (
    <div className="flex items-center gap-1.5" style={{ paddingTop: "var(--row-py)", paddingBottom: "var(--row-py)" }}>
      <IconeMetrica icon={icon} />
      <p className="min-w-0 flex-1 truncate text-[var(--fs-tiny)] text-muted">{label}</p>
      <p className="shrink-0 whitespace-nowrap text-[var(--fs-num)] font-bold">{valor}</p>
      {delta !== null ? (
        <>
          {deltaTexto && (
            <span className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[var(--fs-tiny)] text-muted">
              <IconeDirecao delta={delta} />
              {deltaTexto}
            </span>
          )}
          <Pill
            tone={toneTendencia(tendencia)}
            className="shrink-0 gap-1 whitespace-nowrap px-1.5 py-0.5"
            style={{ fontSize: "var(--fs-tiny)" }}
          >
            {!deltaTexto && <IconeDirecao delta={delta} className="text-current" />}
            {qualificarTendencia(tendencia)}
          </Pill>
        </>
      ) : (
        legendaSemDelta && <p className="shrink-0 whitespace-nowrap text-[var(--fs-tiny)] text-muted">{legendaSemDelta}</p>
      )}
    </div>
  );
}

// Caixa do desktop (label/valor/badge empilhados, centralizados) — layout
// antigo, mantido só aqui porque no desktop a Home rola normal (não tem o
// mesmo aperto de altura do celular) e 3 caixas lado a lado facilita
// comparar os três valores de relance.
function CaixaProgresso({
  icon,
  label,
  valor,
  children,
}: {
  icon: typeof Scale;
  label: string;
  valor: string;
  children: ReactNode;
}) {
  return (
    <div style={{ padding: "var(--pad-inner)" }} className="rounded-xl bg-neutral-soft text-center">
      <div className="mx-auto mb-1">
        <IconeMetrica icon={icon} />
      </div>
      <p className="whitespace-nowrap text-[var(--fs-tiny)] text-muted">{label}</p>
      <p className="text-[var(--fs-num)] font-bold">{valor}</p>
      {children}
    </div>
  );
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
  // aulasFeitasHojeIds só diz "teve PELO MENOS uma série registrada hoje
  // nessa aula" — não "terminou tudo". Usar isso sozinho pra decidir
  // "concluído! 🎉" era o bug: abrir uma notificação no meio do treino (só
  // 1-2 exercícios feitos) e voltar pra Home já mostrava a aula inteira como
  // finalizada. jaFezHoje agora exige TODOS os exercícios feitos hoje
  // (mesma checagem usada na rotação do próximo treino); emAndamento cobre o
  // caso do meio, "comecei mas ainda não terminei".
  const algumFeitoHoje = aulaHoje ? aulasFeitasHojeIds.has(aulaHoje.id) : false;
  const statusHoje = aulaHoje && algumFeitoHoje ? await getStatusExerciciosAulaHoje(aluno.id, aulaHoje.id) : null;
  const jaFezHoje = statusHoje?.todosConcluidos ?? false;
  const emAndamento = algumFeitoHoje && !jaFezHoje;
  // com o treino em andamento, "Continuar treino" pula direto pro primeiro
  // exercício ainda não concluído em vez de mandar pra lista — o aluno não
  // precisa procurar de novo onde parou.
  const proximoExercicioId = statusHoje?.itens.find((i) => !i.concluido)?.aulaExercicioId ?? null;

  const primeiroNome = aluno.nome.split(" ")[0];
  const saudacao = saudacaoPorHorario();
  const pesoAtual = pesoChart.length ? pesoChart[pesoChart.length - 1].valor : null;
  const fechamento = mensagemFechamento(concluidas, meta, resumo);
  const subtitulo = subtituloUltimoTreino(resumo.diasDesdeUltimoTreino);
  const faltam = Math.max(0, meta - concluidas);

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
          {subtitulo && <p className="mt-1 text-[var(--fs-tiny)] leading-tight text-muted">{subtitulo}</p>}
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
        className={`relative flex shrink-0 flex-col justify-center overflow-hidden md:flex-1 ${jaFezHoje ? "bg-gradient-to-br from-success to-success/80 text-white" : "bg-gradient-to-br from-primary-dark to-primary text-white"}`}
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
              Rever treino <ArrowRight size={14} />
            </ButtonLink>
          </>
        ) : aulaHoje && emAndamento ? (
          <>
            <p className="flex items-center gap-1.5 text-[var(--fs-tiny)] font-semibold uppercase tracking-wide text-white/80">
              <Clock size={14} /> Em andamento
            </p>
            <p className="mt-1 max-w-[85%] text-[var(--fs-hero)] font-bold leading-tight">{aulaHoje.nome}</p>
            <ButtonLink
              href={proximoExercicioId ? `/treino/${aulaHoje.id}/exercicio/${proximoExercicioId}` : `/treino/${aulaHoje.id}`}
              size="sm"
              variant="secondary"
              className="mt-3 w-full bg-white text-primary-dark hover:bg-white/90"
            >
              Continuar treino <ArrowRight size={14} />
            </ButtonLink>
          </>
        ) : aulaHoje ? (
          <>
            <p className="text-[var(--fs-tiny)] font-semibold uppercase tracking-wide text-white/80">Próxima aula</p>
            <p className="mt-1 max-w-[85%] text-[var(--fs-hero)] font-bold leading-tight">{aulaHoje.nome}</p>
            <p className="mt-0.5 text-[var(--fs-tiny)] text-white/80">Hoje</p>
            <ButtonLink
              href={`/treino`}
              size="sm"
              variant="secondary"
              className="mt-3 w-full bg-white text-primary-dark hover:bg-white/90"
            >
              Começar treino <ArrowRight size={14} />
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
        <CardTitle className="text-[var(--fs-label)]">Meta semanal</CardTitle>
        {meta > 0 && (
          <div className="mt-3 flex flex-row items-center justify-center gap-3 md:gap-4">
            <AnelMetaSemanal concluidas={concluidas} meta={meta} />
            <div className="max-w-[130px] text-left">
              {/* 1 linha só no celular (orçamento de altura riscado a régua,
                  ver viewport-fit.tsx) — no desktop, que rola normal, as 2
                  linhas do design cabem sem problema. */}
              <p className="text-[var(--fs-tiny)] font-semibold leading-tight md:hidden">
                {faltam === 0 ? "Meta da semana batida! 🎉" : `Falta ${faltam} ${faltam === 1 ? "treino" : "treinos"} pra bater a meta`}
              </p>
              <p className="hidden text-[var(--fs-tiny)] font-semibold leading-tight md:block">
                {concluidas} {concluidas === 1 ? "treino concluído" : "treinos concluídos"}
              </p>
              <p className="mt-0.5 hidden text-[var(--fs-tiny)] leading-tight text-muted md:block">
                {faltam === 0
                  ? "Meta da semana batida! 🎉"
                  : `Falta ${faltam} ${faltam === 1 ? "treino" : "treinos"} para atingir sua meta`}
              </p>
            </div>
          </div>
        )}
      </Card>
      </div>

      <Card
        style={{ padding: "var(--pad-card)", marginBottom: "var(--gap-card)" }}
        className="flex shrink-0 flex-col justify-center md:flex-1"
      >
        <CardTitle className="mb-2 text-[var(--fs-label)]">Seu progresso</CardTitle>
        {/* No celular (orçamento de altura apertado, ver viewport-fit.tsx),
            uma LISTA (ícone+rótulo à esquerda, valor+badge à direita) é mais
            compacta que 3 caixas lado a lado com tudo empilhado dentro de
            cada uma. No desktop (que rola normal, sem esse limite) volta pra
            3 caixas — mais fácil de comparar os três de relance. */}
        <div className="flex flex-col divide-y divide-border md:hidden">
          <LinhaProgresso
            icon={Scale}
            label="Peso"
            valor={pesoAtual !== null ? `${pesoAtual}kg` : "—"}
            delta={resumo.pesoDeltaKg}
            deltaTexto={resumo.pesoDeltaKg !== null ? `${resumo.pesoDeltaKg > 0 ? "+" : ""}${resumo.pesoDeltaKg.toFixed(1)}kg` : undefined}
            tendencia={resumo.pesoTendencia}
            legendaSemDelta="30d"
          />
          <LinhaProgresso
            icon={Dumbbell}
            label="Carga"
            valor={resumo.cargaDeltaPct === null ? "—" : `${resumo.cargaDeltaPct > 0 ? "+" : ""}${resumo.cargaDeltaPct.toFixed(0)}%`}
            delta={resumo.cargaDeltaPct}
            tendencia={resumo.cargaTendencia}
            legendaSemDelta="30d"
          />
          <LinhaProgresso
            icon={Zap}
            label="Aderência"
            valor={`${resumo.aderenciaPct}%`}
            delta={direcaoPorTendencia(resumo.aderenciaTendencia)}
            tendencia={qualificarAderencia(resumo.aderenciaPct).tendencia}
          />
        </div>
        <div className="hidden grid-cols-3 gap-2 md:grid">
          <CaixaProgresso icon={Scale} label="Peso" valor={pesoAtual !== null ? `${pesoAtual}kg` : "—"}>
            {resumo.pesoDeltaKg !== null ? (
              <Pill
                tone={toneTendencia(resumo.pesoTendencia)}
                className="mx-auto mt-1 gap-1 whitespace-nowrap px-1.5 py-0.5"
                style={{ fontSize: "var(--fs-tiny)" }}
              >
                <IconeDirecao delta={resumo.pesoDeltaKg} className="text-current" />
                {qualificarTendencia(resumo.pesoTendencia)}
              </Pill>
            ) : (
              <p className="whitespace-nowrap text-[var(--fs-tiny)] text-muted">30d</p>
            )}
          </CaixaProgresso>
          <CaixaProgresso
            icon={Dumbbell}
            label="Carga"
            valor={resumo.cargaDeltaPct === null ? "—" : `${resumo.cargaDeltaPct > 0 ? "+" : ""}${resumo.cargaDeltaPct.toFixed(0)}%`}
          >
            {resumo.cargaDeltaPct !== null ? (
              <Pill
                tone={toneTendencia(resumo.cargaTendencia)}
                className="mx-auto mt-1 gap-1 whitespace-nowrap px-1.5 py-0.5"
                style={{ fontSize: "var(--fs-tiny)" }}
              >
                <IconeDirecao delta={resumo.cargaDeltaPct} className="text-current" />
                {qualificarTendencia(resumo.cargaTendencia)}
              </Pill>
            ) : (
              <p className="whitespace-nowrap text-[var(--fs-tiny)] text-muted">30d</p>
            )}
          </CaixaProgresso>
          <CaixaProgresso icon={Zap} label="Aderência" valor={`${resumo.aderenciaPct}%`}>
            <Pill
              tone={toneTendencia(qualificarAderencia(resumo.aderenciaPct).tendencia)}
              className="mx-auto mt-1 gap-1 whitespace-nowrap px-1.5 py-0.5"
              style={{ fontSize: "var(--fs-tiny)" }}
            >
              <IconeDirecao delta={direcaoPorTendencia(resumo.aderenciaTendencia)} className="text-current" />
              {qualificarAderencia(resumo.aderenciaPct).label}
            </Pill>
          </CaixaProgresso>
        </div>
      </Card>

      <Link href="/treino" className="block shrink-0">
        <Card
          style={{ padding: "var(--pad-card)" }}
          className="flex flex-row items-center justify-between gap-2 bg-primary-soft transition-colors hover:bg-primary-soft/70 md:flex-1"
        >
          <div>
            <p className="flex items-start gap-2 text-[var(--fs-tiny)] font-medium leading-snug text-foreground">
              <span>{fechamento.emoji}</span>
              {fechamento.texto}
            </p>
            {/* linha extra de incentivo — só no desktop (rola normal, sem o
                orçamento de altura riscado a régua do celular, ver
                viewport-fit.tsx). O próprio mockup mobile já vem sem ela. */}
            <p className="mt-1 hidden pl-6 text-[var(--fs-tiny)] text-muted md:block">{fechamento.sub}</p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-primary" />
        </Card>
      </Link>
    </ViewportFit>
  );
}
