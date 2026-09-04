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

  // Escala fluida do conteúdo (não só do card): cada variável cresce de forma
  // linear e contínua entre um celular baixo (667px de altura útil, o piso já
  // testado sem rolar) e um alto (900px) — abaixo de 667 ou acima de 900 o
  // clamp() trava no mínimo/máximo. Sem isso, o flex-1 dos cards só empurrava
  // padding em volta de um conteúdo do mesmo tamanho sempre, ficando com cara
  // de "sobrando espaço" em vez de preencher de verdade.
  //
  // svh, não dvh/vh: no Safari do iPhone, "vh" (e às vezes até "dvh" logo
  // após o load, antes de qualquer scroll) usa a altura do viewport GRANDE —
  // como se a barra do navegador já estivesse escondida — mesmo com ela
  // visível na tela. Isso fazia o cálculo assumir mais espaço do que
  // realmente tinha disponível e estourava a rolagem justamente no celular
  // real (não reproduzia no Chromium usado nos testes). "svh" trava sempre
  // no viewport PEQUENO (o pior caso, barra visível) — garantido, nunca
  // otimista.
  const escalaCss = {
    "--fs-tiny": "clamp(11px, calc(5.27px + 0.858svh), 13px)",
    "--fs-label": "clamp(14px, calc(5.41px + 1.288svh), 17px)",
    "--fs-num": "clamp(14px, calc(-0.32px + 2.146svh), 19px)",
    "--fs-hero": "clamp(18px, calc(-2.04px + 3.004svh), 25px)",
    "--fs-name": "clamp(20px, calc(-0.04px + 3.004svh), 27px)",
    "--circle": "clamp(36px, calc(1.64px + 5.15svh), 48px)",
    "--pad-card": "clamp(16px, calc(-1.18px + 2.575svh), 22px)",
    "--pad-inner": "clamp(10px, calc(-1.45px + 1.717svh), 14px)",
    "--gap-card": "clamp(10px, calc(-7.18px + 2.575svh), 16px)",
  } as React.CSSProperties;

  return (
    // altura fixa = 100svh (viewport pequeno, garantido — ver nota acima)
    // menos o pb-24 (6rem) que o layout do aluno reserva pra nav inferior
    // fixa — sem isso a página cresce com o conteúdo e rola. Próxima aula /
    // Meta semanal / Seu progresso usam flex-1: o card cresce pra preencher
    // a sobra em celular alto, e o conteúdo cresce junto (ver escalaCss
    // acima) em vez de só ganhar padding em volta. overflow-hidden é a
    // garantia final contra rolagem em aparelho pequeno demais. Desconta
    // ainda env(safe-area-inset-bottom) explicitamente (a faixa de gesto do
    // iPhone sem botão físico — a nav já reserva isso pra si via .safe-bottom,
    // mas contar de novo aqui é mais seguro do que confiar que o pb-24 fixo
    // do layout já é suficiente em todo aparelho) e 10px de folga de segurança.
    <div
      style={escalaCss}
      className="flex h-[calc(100svh-6rem-10px-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden px-4 pb-1.5 pt-3.5"
    >
      <div className="shrink-0" style={{ marginBottom: "var(--gap-card)" }}>
        <p className="text-[var(--fs-tiny)] text-muted">{saudacao},</p>
        <h1 className="text-[var(--fs-name)] font-bold leading-tight">{primeiroNome}! 👋</h1>
      </div>

      <Card
        style={{ padding: "var(--pad-card)", marginBottom: "var(--gap-card)" }}
        className={`flex flex-1 flex-col justify-center ${jaFezHoje ? "bg-success text-white" : "bg-primary text-white"}`}
      >
        {aulaHoje && jaFezHoje ? (
          <>
            <p className="flex items-center gap-1.5 text-[var(--fs-tiny)] font-medium text-white/80">
              <CheckCircle2 size={14} /> Treino de hoje
            </p>
            <p className="mt-1 text-[var(--fs-hero)] font-bold">{aulaHoje.nome} concluído! 🎉</p>
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
            <p className="text-[var(--fs-tiny)] font-medium text-white/80">Próxima aula</p>
            <p className="mt-1 text-[var(--fs-hero)] font-bold">{aulaHoje.nome}</p>
            {aulaHoje.duracao_estimada_min ? (
              <p className="text-[var(--fs-tiny)] text-white/80">~{aulaHoje.duracao_estimada_min} min</p>
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
            <p className="text-[var(--fs-tiny)] font-medium text-white/80">Próxima aula</p>
            <p className="mt-1.5 text-[var(--fs-num)] text-white/90">Hoje é dia de descanso. 💪</p>
          </>
        ) : (
          <>
            <p className="text-[var(--fs-tiny)] font-medium text-white/80">Próxima aula</p>
            <p className="mt-1.5 text-[var(--fs-num)] text-white/90">
              Nenhum treino ativo no momento. Fale com seu personal.
            </p>
          </>
        )}
      </Card>

      <Card
        style={{ padding: "var(--pad-card)", marginBottom: "var(--gap-card)" }}
        className="flex flex-1 flex-col justify-center"
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-[var(--fs-label)]">Meta semanal</CardTitle>
          <span className="text-[var(--fs-tiny)] font-semibold text-muted">
            {concluidas} de {meta || "—"} treinos
          </span>
        </div>
        {meta > 0 && (
          <>
            <div className="mt-3 flex gap-2">
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
            <p className="mt-2.5 text-[var(--fs-tiny)] text-muted">{legendaMetaSemanal(concluidas, meta)}</p>
          </>
        )}
      </Card>

      <Card
        style={{ padding: "var(--pad-card)", marginBottom: "var(--gap-card)" }}
        className="flex flex-1 flex-col justify-center"
      >
        <CardTitle className="mb-2.5 text-[var(--fs-label)]">Seu progresso</CardTitle>
        <div className="grid grid-cols-3 gap-2">
          <div style={{ padding: "var(--pad-inner)" }} className="rounded-xl bg-neutral-soft text-center">
            <p className="text-[var(--fs-tiny)] text-muted">Peso</p>
            <p className="text-[var(--fs-num)] font-bold">{pesoAtual !== null ? `${pesoAtual}kg` : "—"}</p>
            {resumo.pesoDeltaKg !== null && (
              <p
                className={`flex items-center justify-center gap-0.5 text-[var(--fs-tiny)] ${corTendencia(resumo.pesoTendencia).text}`}
              >
                <SetaTendencia tendencia={resumo.pesoTendencia} />
                {Math.abs(resumo.pesoDeltaKg).toFixed(1)}kg
              </p>
            )}
          </div>
          <div style={{ padding: "var(--pad-inner)" }} className="rounded-xl bg-neutral-soft text-center">
            <p className="text-[var(--fs-tiny)] text-muted">Carga média</p>
            <p className="text-[var(--fs-num)] font-bold">
              {resumo.cargaDeltaPct === null ? "—" : `${resumo.cargaDeltaPct > 0 ? "+" : ""}${resumo.cargaDeltaPct.toFixed(0)}%`}
            </p>
            <p className="text-[var(--fs-tiny)] text-muted">30d</p>
          </div>
          <div style={{ padding: "var(--pad-inner)" }} className="rounded-xl bg-neutral-soft text-center">
            <p className="text-[var(--fs-tiny)] text-muted">Aderência</p>
            <p className="text-[var(--fs-num)] font-bold">{resumo.aderenciaPct}%</p>
            <p className="text-[var(--fs-tiny)] text-muted">{qualificarAderencia(resumo.aderenciaPct)}</p>
          </div>
        </div>
      </Card>

      <Card style={{ padding: "var(--pad-card)" }} className="shrink-0 bg-primary-soft">
        <p className="flex items-start gap-2 text-[var(--fs-num)] font-medium leading-snug text-foreground">
          <span>{fechamento.emoji}</span>
          {fechamento.texto}
        </p>
      </Card>
    </div>
  );
}
