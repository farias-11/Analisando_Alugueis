import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatDataBR, formatMoedaBR } from "@/lib/status";
import { FinanceiroListaSelecionavel } from "@/components/financeiro-lista-selecionavel";
import { DualBarChart, type DualBarPoint } from "@/components/charts/dual-bar-chart";
import { DonutChart, type DonutSlice } from "@/components/charts/donut-chart";
import { ExportarCsvButton, ExportarCsvButtonAReceber } from "@/components/exportar-csv-button";
import { ArrowDown, ArrowUp } from "lucide-react";
import Link from "next/link";
import type { Aluno } from "@/lib/types";

type AlunoComPlano = Aluno & { planoValor: number | null };

type PagamentoComAluno = {
  id: string;
  valor: number;
  data_pagamento: string;
  forma_pagamento: string;
  alunos: { nome: string; planos: { dia_pagamento: number | null } | null } | null;
};

const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const PERIODOS = [
  { valor: "3m", label: "3 meses", meses: 3 },
  { valor: "6m", label: "6 meses", meses: 6 },
  { valor: "12m", label: "12 meses", meses: 12 },
  { valor: "tudo", label: "Tudo", meses: null },
] as const;
type Periodo = (typeof PERIODOS)[number]["valor"];

const COMPARACOES = [
  { valor: "mes", label: "Mês a mês" },
  { valor: "ano_anterior", label: "Ano a ano" },
] as const;
type Comparar = (typeof COMPARACOES)[number]["valor"];

const CORES_FORMA_PAGAMENTO: Record<string, string> = {
  Pix: "var(--primary)",
  Cartão: "var(--success)",
  Dinheiro: "var(--warning)",
  Transferência: "var(--muted-2)",
};

function chaveMes(iso: string) {
  return iso.slice(0, 7); // "AAAA-MM"
}
function chaveMesDeslocada(offset: number) {
  const d = new Date();
  d.setDate(1); // evita virar de mês em meses com menos dias
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
}
function tituloMes(chave: string) {
  const [ano, mes] = chave.split("-");
  return `${NOMES_MES[Number(mes) - 1]}/${ano.slice(2)}`;
}
function deltaPct(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}

// "Recebido" vem do histórico real de pagamentos; "a receber" só existe como
// fotografia da cobrança atual de cada aluno (pagamento_valor/vencimento não
// guardam histórico de meses passados) — por isso a coluna "a receber" só
// aparece de fato nos meses atual/próximo, onde há vencimento pendente.
function buildRecebidoVsAReceber(filtrados: PagamentoComAluno[], alunos: AlunoComPlano[]): DualBarPoint[] {
  const recebidoPorMes = new Map<string, number>();
  for (const p of filtrados) {
    const chave = chaveMes(p.data_pagamento);
    recebidoPorMes.set(chave, (recebidoPorMes.get(chave) ?? 0) + Number(p.valor));
  }
  const aReceberPorMes = new Map<string, number>();
  for (const a of alunos) {
    if (!a.pagamento_vencimento) continue;
    const chave = chaveMes(a.pagamento_vencimento);
    aReceberPorMes.set(chave, (aReceberPorMes.get(chave) ?? 0) + Number(a.pagamento_valor ?? 0));
  }
  const chaves = Array.from(new Set([...recebidoPorMes.keys(), ...aReceberPorMes.keys()])).sort();
  return chaves.map((chave) => ({
    data: tituloMes(chave),
    a: Math.round((recebidoPorMes.get(chave) ?? 0) * 100) / 100,
    b: Math.round((aReceberPorMes.get(chave) ?? 0) * 100) / 100,
  }));
}

// compara os 12 meses do ano atual com os mesmos meses do ano anterior —
// usa todo o histórico já carregado (não respeita o filtro de período,
// que é uma janela rolante e não faz sentido pra comparação de época).
function buildComparacaoAno(pagamentos: PagamentoComAluno[], anoAtual: number): DualBarPoint[] {
  const porChave = new Map<string, number>();
  for (const p of pagamentos) {
    const chave = chaveMes(p.data_pagamento);
    porChave.set(chave, (porChave.get(chave) ?? 0) + Number(p.valor));
  }
  const anoAnterior = anoAtual - 1;
  return NOMES_MES.map((nome, i) => {
    const mm = String(i + 1).padStart(2, "0");
    return {
      data: nome,
      a: Math.round((porChave.get(`${anoAtual}-${mm}`) ?? 0) * 100) / 100,
      b: Math.round((porChave.get(`${anoAnterior}-${mm}`) ?? 0) * 100) / 100,
    };
  });
}

function buildComposicaoFormaPagamento(filtrados: PagamentoComAluno[]): DonutSlice[] {
  const porForma = new Map<string, number>();
  for (const p of filtrados) {
    porForma.set(p.forma_pagamento, (porForma.get(p.forma_pagamento) ?? 0) + Number(p.valor));
  }
  return Array.from(porForma.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, valor]) => ({
      label,
      valor: Math.round(valor * 100) / 100,
      cor: CORES_FORMA_PAGAMENTO[label] ?? "var(--muted-2)",
    }));
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null || pct === 0) return null;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${pct > 0 ? "text-success" : "text-danger"}`}>
      {pct > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(pct)}%
    </span>
  );
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; periodo?: string; comparar?: string }>;
}) {
  const { personal } = await requirePersonal();
  const { aba = "a_receber", periodo: periodoParam, comparar: compararParam } = await searchParams;
  const periodo: Periodo = PERIODOS.some((p) => p.valor === periodoParam) ? (periodoParam as Periodo) : "6m";
  const comparar: Comparar = COMPARACOES.some((c) => c.valor === compararParam) ? (compararParam as Comparar) : "mes";
  const supabase = await createClient();

  // busca tudo de uma vez (personal costuma ter poucas dezenas de alunos e
  // pagamentos — sem necessidade de paginar) e monta os 3 cards do topo +
  // o conteúdo específico da aba a partir do mesmo par de consultas
  const [{ data: pagamentosData }, { data: alunosData }] = await Promise.all([
    supabase
      .from("pagamentos")
      .select("*, alunos!inner(nome, personal_id, planos(dia_pagamento))")
      .eq("alunos.personal_id", personal.id)
      .order("data_pagamento", { ascending: false })
      .limit(500),
    supabase
      .from("alunos")
      .select("*, planos(valor)")
      .eq("personal_id", personal.id)
      .eq("status", "ativo")
      .eq("status_convite", "aceito")
      .order("pagamento_status", { ascending: false }),
  ]);

  const todosPagamentos = (pagamentosData ?? []) as unknown as PagamentoComAluno[];
  const alunos = (alunosData ?? []).map((a) => {
    const { planos, ...aluno } = a as typeof a & { planos: { valor: number } | null };
    return { ...aluno, planoValor: planos?.valor ?? null };
  });

  // --- cards do topo (independem da aba/período selecionado) ---
  const mesAtualChave = chaveMesDeslocada(0);
  const mesAnteriorChave = chaveMesDeslocada(-1);
  const pagamentosMesAtual = todosPagamentos.filter((p) => chaveMes(p.data_pagamento) === mesAtualChave);
  const pagamentosMesAnterior = todosPagamentos.filter((p) => chaveMes(p.data_pagamento) === mesAnteriorChave);
  const receitaMesAtual = pagamentosMesAtual.reduce((s, p) => s + Number(p.valor), 0);
  const receitaMesAnterior = pagamentosMesAnterior.reduce((s, p) => s + Number(p.valor), 0);
  const pagantesMesAtual = new Set(pagamentosMesAtual.map((p) => p.alunos?.nome)).size;
  const pagantesMesAnterior = new Set(pagamentosMesAnterior.map((p) => p.alunos?.nome)).size;
  const ticketMedioMesAtual = pagantesMesAtual > 0 ? receitaMesAtual / pagantesMesAtual : 0;
  const ticketMedioMesAnterior = pagantesMesAnterior > 0 ? receitaMesAnterior / pagantesMesAnterior : 0;
  const totalEmAberto = alunos
    .filter((a) => a.pagamento_status === "atrasado")
    .reduce((s, a) => s + Number(a.pagamento_valor ?? 0), 0);

  return (
    <div className="space-y-4 p-4 md:p-0">
      <h1 className="text-xl font-bold">Financeiro</h1>

      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center">
          <p className="text-[11px] text-muted">Receita (mês)</p>
          <p className="text-base font-bold">{formatMoedaBR(receitaMesAtual)}</p>
          <div className="mt-0.5 flex justify-center">
            <DeltaBadge pct={deltaPct(receitaMesAtual, receitaMesAnterior)} />
          </div>
        </Card>
        <Card className="text-center">
          <p className="text-[11px] text-muted">Em aberto</p>
          <p className="text-base font-bold text-danger">{formatMoedaBR(totalEmAberto)}</p>
        </Card>
        <Card className="text-center">
          <p className="text-[11px] text-muted">Ticket médio</p>
          <p className="text-base font-bold">{formatMoedaBR(ticketMedioMesAtual)}</p>
          <div className="mt-0.5 flex justify-center">
            <DeltaBadge pct={deltaPct(ticketMedioMesAtual, ticketMedioMesAnterior)} />
          </div>
        </Card>
      </div>

      <Abas aba={aba} />

      {aba === "recebidos" ? (
        <AbaRecebidos pagamentos={todosPagamentos} alunos={alunos} periodo={periodo} comparar={comparar} />
      ) : (
        <AbaAReceber alunos={alunos} />
      )}
    </div>
  );
}

function AbaRecebidos({
  pagamentos,
  alunos,
  periodo,
  comparar,
}: {
  pagamentos: PagamentoComAluno[];
  alunos: AlunoComPlano[];
  periodo: Periodo;
  comparar: Comparar;
}) {
  const configPeriodo = PERIODOS.find((p) => p.valor === periodo)!;
  const corte = configPeriodo.meses ? chaveMesDeslocada(-(configPeriodo.meses - 1)) : null;
  const filtrados = corte ? pagamentos.filter((p) => chaveMes(p.data_pagamento) >= corte) : pagamentos;

  const total = filtrados.reduce((s, p) => s + Number(p.valor), 0);
  const anoAtual = new Date().getFullYear();
  const composicao = buildComposicaoFormaPagamento(filtrados);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FiltroPeriodo periodo={periodo} />
        <ToggleComparacao periodo={periodo} comparar={comparar} />
      </div>

      <Card>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
          {comparar === "ano_anterior" ? `Recebido — ${anoAtual} vs. ${anoAtual - 1}` : "Recebido vs. a receber"}
        </p>
        {comparar === "ano_anterior" ? (
          <DualBarChart
            data={buildComparacaoAno(pagamentos, anoAtual)}
            labelA={String(anoAtual)}
            labelB={String(anoAtual - 1)}
            colorA="var(--primary)"
            colorB="var(--muted-2)"
          />
        ) : (
          <DualBarChart
            data={buildRecebidoVsAReceber(filtrados, alunos)}
            labelA="Recebido"
            labelB="A receber"
            colorA="var(--success)"
            colorB="var(--warning)"
          />
        )}
      </Card>

      {composicao.length > 0 && (
        <Card>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">Composição por forma de pagamento</p>
          <DonutChart data={composicao} />
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Total no período: <span className="font-semibold text-foreground">{formatMoedaBR(total)}</span>
        </p>
        <ExportarCsvButton
          linhas={filtrados.map((p) => ({
            aluno: p.alunos?.nome ?? "—",
            data: p.data_pagamento,
            forma: p.forma_pagamento,
            valor: Number(p.valor),
          }))}
        />
      </div>

      <div className="space-y-2">
        {filtrados.map((p) => (
          <Card key={p.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{p.alunos?.nome}</p>
              <p className="text-xs text-muted">
                {formatDataBR(p.data_pagamento)} · {p.forma_pagamento}
                {p.alunos?.planos?.dia_pagamento ? ` · cobra todo dia ${p.alunos.planos.dia_pagamento}` : ""}
              </p>
            </div>
            <p className="text-sm font-semibold">{formatMoedaBR(p.valor)}</p>
          </Card>
        ))}
        {filtrados.length === 0 && <p className="text-sm text-muted">Nenhum pagamento nesse período.</p>}
      </div>
    </>
  );
}

function AbaAReceber({ alunos }: { alunos: AlunoComPlano[] }) {
  const agora = new Date();
  const hojeStr = agora.toISOString().slice(0, 10);
  const em7Dias = new Date(agora);
  em7Dias.setDate(em7Dias.getDate() + 7);
  const em7DiasStr = em7Dias.toISOString().slice(0, 10);

  const atrasados = alunos.filter((a) => a.pagamento_status === "atrasado");
  const venceHoje = alunos.filter((a) => a.pagamento_status !== "atrasado" && a.pagamento_vencimento === hojeStr);
  const venceEm7Dias = alunos.filter(
    (a) =>
      a.pagamento_status !== "atrasado" &&
      a.pagamento_vencimento &&
      a.pagamento_vencimento > hojeStr &&
      a.pagamento_vencimento <= em7DiasStr
  );

  const somaBucket = (lista: AlunoComPlano[]) => lista.reduce((s, a) => s + Number(a.pagamento_valor ?? 0), 0);

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center">
          <p className="text-[11px] text-muted">Vence hoje</p>
          <p className="text-base font-bold">{formatMoedaBR(somaBucket(venceHoje))}</p>
          <p className="text-[11px] text-muted">{venceHoje.length} aluno{venceHoje.length === 1 ? "" : "s"}</p>
        </Card>
        <Card className="text-center">
          <p className="text-[11px] text-muted">Até 7 dias</p>
          <p className="text-base font-bold">{formatMoedaBR(somaBucket(venceEm7Dias))}</p>
          <p className="text-[11px] text-muted">{venceEm7Dias.length} aluno{venceEm7Dias.length === 1 ? "" : "s"}</p>
        </Card>
        <Card className="text-center border-danger/30 bg-danger-soft">
          <p className="text-[11px] text-danger">Atraso</p>
          <p className="text-base font-bold text-danger">{formatMoedaBR(somaBucket(atrasados))}</p>
          <p className="text-[11px] text-danger">{atrasados.length} aluno{atrasados.length === 1 ? "" : "s"}</p>
        </Card>
      </div>

      <div className="flex justify-end">
        <ExportarCsvButtonAReceber
          linhas={alunos.map((a) => ({
            aluno: a.nome,
            vencimento: a.pagamento_vencimento,
            status: a.pagamento_status,
            valor: Number(a.pagamento_valor ?? 0),
          }))}
        />
      </div>

      <FinanceiroListaSelecionavel alunos={alunos} />
    </>
  );
}

function ToggleComparacao({ periodo, comparar }: { periodo: Periodo; comparar: Comparar }) {
  return (
    <div className="flex gap-1.5">
      {COMPARACOES.map((c) => (
        <Link
          key={c.valor}
          href={`/financeiro?aba=recebidos&periodo=${periodo}&comparar=${c.valor}`}
          className={`shrink-0 rounded-pill border px-3 py-1 text-xs font-medium ${
            comparar === c.valor ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"
          }`}
        >
          {c.label}
        </Link>
      ))}
    </div>
  );
}

function FiltroPeriodo({ periodo }: { periodo: Periodo }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {PERIODOS.map((p) => (
        <Link
          key={p.valor}
          href={`/financeiro?aba=recebidos&periodo=${p.valor}`}
          className={`shrink-0 rounded-pill border px-3 py-1 text-xs font-medium ${
            periodo === p.valor ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}

function Abas({ aba }: { aba: string }) {
  return (
    <div className="flex gap-2">
      <Link
        href="/financeiro?aba=a_receber"
        className={`rounded-pill border px-3.5 py-1.5 text-sm font-medium ${aba !== "recebidos" ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"}`}
      >
        A receber
      </Link>
      <Link
        href="/financeiro?aba=recebidos"
        className={`rounded-pill border px-3.5 py-1.5 text-sm font-medium ${aba === "recebidos" ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"}`}
      >
        Recebidos
      </Link>
    </div>
  );
}
