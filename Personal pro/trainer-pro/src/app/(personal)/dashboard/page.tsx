import { requirePersonal } from "@/lib/data/current-user";
import { getDashboardData } from "@/lib/data/dashboard";
import { pedirAtualizacao } from "@/app/actions/alunos";
import { Card, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { formatMoedaBR } from "@/lib/status";
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
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { InstallPromptBanner } from "@/components/install-prompt-banner";
import Link from "next/link";

const RÓTULO_TIPO: Record<string, { cor: string }> = {
  pagamento_atrasado: { cor: "text-danger bg-danger-soft" },
  ticket_aberto: { cor: "text-danger bg-danger-soft" },
  ciclo_vencido: { cor: "text-warning bg-warning-soft" },
  sem_checkin: { cor: "text-warning bg-warning-soft" },
  avaliacao_pendente: { cor: "text-muted bg-neutral-soft" },
};

export default async function DashboardPage() {
  const { personal } = await requirePersonal();
  const data = await getDashboardData(personal.id);
  const { radar, radarTotal, ciclosVencendoSemana, financeiroSemana, destaquesEvolucao, resumo } = data;

  return (
    <div className="space-y-5 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted">Olá, {personal.nome.split(" ")[0]}</p>
        <p className="mt-1 text-sm font-medium text-foreground/80">{data.fraseAbertura}</p>
      </div>

      <InstallPromptBanner />

      {/* Radar de prioridades (handoff 2.3) — substitui as 4 caixas fixas por
          uma lista única por aluno, ordenada por urgência, com ação de 1
          clique embutida na linha. */}
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

      {/* Faixa "ciclos vencendo esta semana" (2.4) — complemento ao radar,
          mostra quem vence nos próximos 7 dias mesmo sem estar urgente ainda. */}
      {ciclosVencendoSemana.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
            <Calendar size={13} /> Ciclos vencendo esta semana
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ciclosVencendoSemana.map((c) => (
              <Link
                key={c.alunoId}
                href={`/alunos/${c.alunoId}/treino`}
                className="shrink-0 rounded-xl border border-border bg-surface px-3 py-2 text-xs"
              >
                <p className="font-medium text-foreground">{c.alunoNome}</p>
                <p className="text-muted">{c.diasRestantes === 0 ? "vence hoje" : `em ${c.diasRestantes}d`}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Financeiro resumido (2.5) — evita o desvio diário até a aba Financeiro */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Recebido nos últimos 7 dias</p>
            <p className="text-lg font-bold text-success">{formatMoedaBR(financeiroSemana.recebidoSemana)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Em aberto</p>
            <p className="text-lg font-bold text-danger">{formatMoedaBR(financeiroSemana.emAberto)}</p>
          </div>
        </div>
        <Link href="/financeiro" className="mt-2 flex items-center justify-center gap-1 text-xs font-medium text-primary">
          Ver financeiro completo <ChevronRight size={13} />
        </Link>
      </Card>

      {/* Resumo discreto — números sem ação pendente, não competem com o radar */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center">
          <p className="text-2xl font-bold">{resumo.alunosAtivos}</p>
          <p className="text-xs text-muted">Alunos ativos</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{resumo.treinosConcluidosHoje}</p>
          <p className="text-xs text-muted">Treinos hoje</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{resumo.aderenciaMedia}%</p>
          <p className="flex items-center justify-center gap-0.5 text-xs text-muted">
            Aderência média
            {resumo.aderenciaTendenciaPP !== null && resumo.aderenciaTendenciaPP !== 0 && (
              <span className={`ml-1 flex items-center ${resumo.aderenciaTendenciaPP > 0 ? "text-success" : "text-danger"}`}>
                {resumo.aderenciaTendenciaPP > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                {Math.abs(resumo.aderenciaTendenciaPP)}pp
              </span>
            )}
          </p>
        </Card>
      </div>

      {/* Destaques de evolução (2.6) */}
      {destaquesEvolucao.length > 0 && (
        <Card>
          <CardTitle className="mb-2 flex items-center gap-1.5">
            <TrendingUp size={16} className="text-success" /> Destaques de evolução
          </CardTitle>
          <div className="space-y-1.5">
            {destaquesEvolucao.map((d) => (
              <Link key={d.alunoId} href={`/alunos/${d.alunoId}?aba=historico`} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{d.alunoNome}</span>
                <span className="font-semibold text-success">+{d.cargaDeltaPct}% carga</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

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
