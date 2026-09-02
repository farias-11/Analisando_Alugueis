import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatDataBR, formatMoedaBR } from "@/lib/status";
import { FinanceiroListaSelecionavel } from "@/components/financeiro-lista-selecionavel";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { ExportarCsvButton } from "@/components/exportar-csv-button";
import Link from "next/link";

type PagamentoComAluno = {
  id: string;
  valor: number;
  data_pagamento: string;
  forma_pagamento: string;
  alunos: { nome: string } | null;
};

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { personal } = await requirePersonal();
  const { aba = "a_receber" } = await searchParams;
  const supabase = await createClient();

  if (aba === "recebidos") {
    // filtra por personal_id direto na tabela relacionada (join !inner) em vez
    // de buscar os ids dos alunos numa query separada antes — evita uma ida
    // ao banco sequencial só pra montar o filtro da próxima
    const { data: pagamentosData } = await supabase
      .from("pagamentos")
      .select("*, alunos!inner(nome, personal_id)")
      .eq("alunos.personal_id", personal.id)
      .order("data_pagamento", { ascending: false })
      .limit(200);

    const pagamentos = (pagamentosData ?? []) as unknown as PagamentoComAluno[];
    const total = pagamentos.reduce((s, p) => s + Number(p.valor), 0);
    const alunosPagantes = new Set(pagamentos.map((p) => p.alunos?.nome)).size;
    const ticketMedio = alunosPagantes > 0 ? total / alunosPagantes : 0;

    // receita mês a mês (últimos 6 meses com pagamento) — a partir do mesmo
    // conjunto já carregado, sem consulta extra
    const porMes = new Map<string, number>();
    for (const p of pagamentos) {
      const chave = p.data_pagamento.slice(0, 7); // "AAAA-MM"
      porMes.set(chave, (porMes.get(chave) ?? 0) + Number(p.valor));
    }
    const mesesOrdenados = Array.from(porMes.keys()).sort().slice(-6);
    const NOMES_MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    const receitaPorMes = mesesOrdenados.map((chave) => {
      const [ano, mes] = chave.split("-");
      return { data: `${NOMES_MES[Number(mes) - 1]}/${ano.slice(2)}`, valor: Math.round(porMes.get(chave)! * 100) / 100 };
    });

    return (
      <div className="space-y-4 p-4 md:p-0">
        <h1 className="text-xl font-bold">Financeiro</h1>
        <Abas aba={aba} />

        {receitaPorMes.length > 1 && (
          <Card>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Receita mês a mês</p>
            <SimpleLineChart data={receitaPorMes} tendenciaDelta="maior_melhor" moeda />
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs text-muted">Total recebido</p>
            <p className="text-xl font-bold">{formatMoedaBR(total)}</p>
          </Card>
          <Card>
            <p className="text-xs text-muted">Ticket médio por aluno</p>
            <p className="text-xl font-bold">{formatMoedaBR(ticketMedio)}</p>
          </Card>
        </div>

        <div className="flex justify-end">
          <ExportarCsvButton
            linhas={pagamentos.map((p) => ({
              aluno: p.alunos?.nome ?? "—",
              data: p.data_pagamento,
              forma: p.forma_pagamento,
              valor: Number(p.valor),
            }))}
          />
        </div>

        <div className="space-y-2">
          {pagamentos.map((p) => (
            <Card key={p.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{p.alunos?.nome}</p>
                <p className="text-xs text-muted">
                  {formatDataBR(p.data_pagamento)} · {p.forma_pagamento}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatMoedaBR(p.valor)}</p>
            </Card>
          ))}
          {pagamentos.length === 0 && <p className="text-sm text-muted">Nenhum pagamento registrado ainda.</p>}
        </div>
      </div>
    );
  }

  // convite pendente não conta como aluno ativo pra cobrança — ele ainda nem
  // acessou o app, não faz sentido aparecer devendo mensalidade
  const { data: alunos } = await supabase
    .from("alunos")
    .select("*")
    .eq("personal_id", personal.id)
    .eq("status", "ativo")
    .eq("status_convite", "aceito")
    .order("pagamento_status", { ascending: false });

  const totalReceber = (alunos ?? [])
    .filter((a) => a.pagamento_status === "atrasado")
    .reduce((s, a) => s + Number(a.pagamento_valor ?? 0), 0);

  return (
    <div className="space-y-4 p-4 md:p-0">
      <h1 className="text-xl font-bold">Financeiro</h1>
      <Abas aba={aba} />

      <Card>
        <p className="text-xs text-muted">A receber (atrasados)</p>
        <p className="text-2xl font-bold text-danger">{formatMoedaBR(totalReceber)}</p>
      </Card>

      <FinanceiroListaSelecionavel alunos={alunos ?? []} />
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
