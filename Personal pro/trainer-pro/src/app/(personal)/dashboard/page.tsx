import { requirePersonal } from "@/lib/data/current-user";
import { getDashboardData, PERIODOS, type Periodo } from "@/lib/data/dashboard";
import { pedirAtualizacao } from "@/app/actions/alunos";
import { Card, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { formatMoedaBR, saudacaoPorHorario } from "@/lib/status";
import {
  ArrowUp,
  ArrowDown,
  Bell,
  Calendar,
  ChevronRight,
  ClipboardList,
  Layers,
  Library,
  MessageCircleWarning,
  Trophy,
  UserPlus,
} from "lucide-react";
import { InstallPromptBanner } from "@/components/install-prompt-banner";
import Link from "next/link";
import Image from "next/image";

const RÓTULO_TIPO: Record<string, { cor: string }> = {
  pagamento_atrasado: { cor: "text-danger bg-danger-soft" },
  ticket_aberto: { cor: "text-danger bg-danger-soft" },
  ciclo_vencido: { cor: "text-warning bg-warning-soft" },
  sem_checkin: { cor: "text-warning bg-warning-soft" },
  avaliacao_pendente: { cor: "text-muted bg-neutral-soft" },
};

function DeltaBadge({ valor, unidade = "%", corInvertida = false }: { valor: number | null; unidade?: string; corInvertida?: boolean }) {
  if (valor === null || valor === 0) return null;
  const positivo = corInvertida ? valor < 0 : valor > 0;
  return (
    <span className={`ml-1 flex items-center text-xs font-semibold ${positivo ? "text-success" : "text-danger"}`}>
      {valor > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(valor)}
      {unidade}
    </span>
  );
}

function KpiCard({
  label,
  valor,
  delta,
  unidadeDelta,
  corInvertida,
}: {
  label: string;
  valor: string | number;
  delta: number | null;
  unidadeDelta?: string;
  corInvertida?: boolean;
}) {
  return (
    <Card className="text-center">
      <p className="text-2xl font-bold">{valor}</p>
      <p className="flex items-center justify-center gap-0.5 text-xs text-muted">
        {label}
        <DeltaBadge valor={delta} unidade={unidadeDelta} corInvertida={corInvertida} />
      </p>
    </Card>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { personal } = await requirePersonal();
  const { periodo: periodoParam } = await searchParams;
  const periodo: Periodo = PERIODOS.some((p) => p.valor === periodoParam) ? (periodoParam as Periodo) : "semana";
  const data = await getDashboardData(personal.id, periodo);
  const { radar, radarTotal, ciclosVencendo, destaquesEvolucao, financeiroPeriodo, kpis } = data;
  const primeiroNome = personal.nome.split(" ")[0];
  const saudacao = saudacaoPorHorario();

  return (
    <div className="space-y-5 p-4 md:p-0">
      <div className="flex items-center justify-between gap-3 pr-14 md:pr-0">
        <div>
          <h1 className="text-xl font-bold">Dashboard</h1>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {saudacao}, {primeiroNome} 👋
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PERIODOS.map((p) => (
          <Link
            key={p.valor}
            href={`/dashboard?periodo=${p.valor}`}
            className={`rounded-pill border px-3 py-1 text-xs font-medium ${
              periodo === p.valor ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"
            }`}
          >
            {p.label}
          </Link>
        ))}
      </div>
      <h2 className="text-lg font-bold leading-snug">
        {radarTotal > 0 ? (
          <>
            Hoje temos{" "}
            <span className="text-primary">
              {radarTotal} pendência{radarTotal === 1 ? "" : "s"} importante{radarTotal === 1 ? "" : "s"}
            </span>{" "}
            que precisa{radarTotal === 1 ? "" : "m"} da sua atenção.
          </>
        ) : (
          "Tudo em dia por aqui. 🎉"
        )}
      </h2>

      <InstallPromptBanner />

      {/* 4 KPIs com tendência vs. período anterior. Alunos ativos usa
          data_inicio (fixo por aluno) pra contar entradas reais no período —
          é contagem de entradas, não delta líquido (não detecta quem saiu).
          Treinos p/ revisar fica sem delta: reconstruir esse número no
          passado exigiria olhar ciclos que já foram renovados/substituídos
          desde então, e ciclos.ativo só reflete o estado atual — não dá pra
          provar sem inventar. Aderência e Tickets já têm dado histórico
          real de sobra pra sustentar o delta. */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard label="Alunos ativos" valor={kpis.alunosAtivos} delta={kpis.alunosAtivosTendencia} unidadeDelta="" />
        <KpiCard label="Aderência" valor={`${kpis.aderenciaPct}%`} delta={kpis.aderenciaTendenciaPP} unidadeDelta="pp" />
        <KpiCard label="Treinos p/ revisar" valor={kpis.treinosParaRevisar} delta={null} />
        <KpiCard label="Tickets abertos" valor={kpis.ticketsAbertos} delta={kpis.ticketsTendenciaPct} corInvertida />
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        {/* Radar de prioridades (handoff 2.3) — lista única por aluno,
            ordenada por urgência, com ação de 1 clique embutida na linha. */}
        <Card className={radar.length ? "border-warning/30 bg-warning-soft" : undefined}>
          <CardTitle className="mb-3 flex items-center gap-2">
            <Bell size={16} className={radar.length ? "text-warning" : "text-muted"} />
            Radar de prioridades
          </CardTitle>
          {radar.length === 0 ? (
            <p className="text-sm text-muted">Tudo em dia por aqui. 🎉</p>
          ) : (
            <div className="space-y-2">
              {radar.map((item) => (
                <div key={`${item.tipo}-${item.alunoId}`} className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.alunoNome}</p>
                    <p className={`mt-0.5 inline-block rounded-pill px-1.5 py-0.5 text-[11px] ${RÓTULO_TIPO[item.tipo]?.cor ?? "text-muted bg-neutral-soft"}`}>
                      {item.detalhe}
                    </p>
                  </div>
                  {item.acao.formPedir ? (
                    <form action={pedirAtualizacao}>
                      <input type="hidden" name="alunoId" value={item.alunoId} />
                      <button type="submit" className="shrink-0 rounded-pill bg-primary px-3 py-1.5 text-xs font-semibold text-white">
                        {item.acao.label}
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={item.acao.href}
                      target={item.acao.externo ? "_blank" : undefined}
                      className="shrink-0 rounded-pill bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {item.acao.label}
                    </Link>
                  )}
                </div>
              ))}
              {radarTotal > radar.length && (
                <Link href="/alunos?ordenar=urgencia" className="flex items-center justify-center gap-1 pt-1 text-xs font-medium text-primary">
                  Ver os outros {radarTotal - radar.length} <ChevronRight size={13} />
                </Link>
              )}
            </div>
          )}
        </Card>

        {/* Ciclos vencendo esta semana (2.4) — janela fixa de 7 dias, não
            escala com o período selecionado (senão em "Ano" mostraria todo
            mundo e perderia o propósito de aviso). */}
        <Card>
          <CardTitle className="mb-3 flex items-center gap-2">
            <Calendar size={15} /> Ciclos vencendo esta semana
          </CardTitle>
          {ciclosVencendo.length === 0 ? (
            <p className="text-sm text-muted">Nenhum ciclo vencendo nos próximos 7 dias.</p>
          ) : (
            <div className="space-y-2">
              {ciclosVencendo.map((c) => (
                <Link
                  key={c.alunoId}
                  href={`/alunos/${c.alunoId}/treino`}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs"
                >
                  <span className="font-medium text-foreground">{c.alunoNome}</span>
                  <span className="text-muted">{c.diasRestantes === 0 ? "vence hoje" : `em ${c.diasRestantes}d`}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Financeiro resumido (2.5) — evita o desvio diário até a aba Financeiro */}
        <Card>
          <CardTitle className="mb-3">Financeiro — {PERIODOS.find((p) => p.valor === periodo)!.label.toLowerCase()}</CardTitle>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted">Recebido</p>
              <p className="flex items-center gap-1 text-lg font-bold text-success">
                {formatMoedaBR(financeiroPeriodo.recebido)}
                <DeltaBadge valor={financeiroPeriodo.recebidoTendenciaPct} />
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Em aberto</p>
              <p className="text-lg font-bold text-danger">{formatMoedaBR(financeiroPeriodo.emAberto)}</p>
            </div>
          </div>
          <Link href="/financeiro" className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-primary">
            Ver financeiro completo <ChevronRight size={13} />
          </Link>
        </Card>

        {/* Destaques de evolução (2.6) — pódio compacto dos 3 alunos que mais
            subiram carga média no período de 30 dias */}
        <Card>
          <CardTitle className="mb-3 flex items-center gap-2">
            <Trophy size={15} className="text-warning" /> Destaques de evolução
          </CardTitle>
          {destaquesEvolucao.length === 0 ? (
            <p className="text-sm text-muted">Sem dados suficientes ainda pra ranquear evolução de carga.</p>
          ) : (
            <div className="flex items-end justify-center gap-3">
              {[destaquesEvolucao[1], destaquesEvolucao[0], destaquesEvolucao[2]].map((d, i) =>
                d ? (
                  <Link
                    key={d.alunoId}
                    href={`/alunos/${d.alunoId}?aba=historico`}
                    className="flex flex-col items-center gap-1"
                  >
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-primary-soft">
                      {d.fotoUrl ? (
                        <Image src={d.fotoUrl} alt={d.alunoNome} fill sizes="44px" className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary-dark">
                          {d.alunoNome.charAt(0)}
                        </span>
                      )}
                    </div>
                    <p className="max-w-16 truncate text-center text-[11px] font-medium">{d.alunoNome.split(" ")[0]}</p>
                    <p className="text-[11px] font-semibold text-success">+{d.cargaDeltaPct}%</p>
                    <div
                      className={`w-10 rounded-t-md ${i === 1 ? "bg-warning" : i === 0 ? "bg-muted-2" : "bg-primary/40"}`}
                      style={{ height: i === 1 ? 36 : i === 0 ? 24 : 14 }}
                    />
                  </Link>
                ) : (
                  <div key={i} className="w-11" />
                )
              )}
            </div>
          )}
        </Card>
      </div>

      <div>
        <CardTitle className="mb-2">Atalhos rápidos</CardTitle>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ButtonLink href="/alunos/convidar" variant="outline" prefetch={false} className="justify-start gap-2">
            <UserPlus size={16} /> Convidar aluno
          </ButtonLink>
          <ButtonLink href="/alunos" variant="outline" prefetch={false} className="justify-start gap-2">
            <ClipboardList size={16} /> Ver alunos
          </ButtonLink>
          <ButtonLink href="/tickets" variant="outline" prefetch={false} className="justify-start gap-2">
            <MessageCircleWarning size={16} /> Tickets de dor
          </ButtonLink>
          <ButtonLink href="/biblioteca" variant="outline" prefetch={false} className="justify-start gap-2">
            <Library size={16} /> Biblioteca
          </ButtonLink>
          <ButtonLink href="/templates" variant="outline" prefetch={false} className="justify-start gap-2">
            <Layers size={16} /> Templates
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
