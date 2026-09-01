import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { marcarComoPago } from "@/app/actions/alunos";
import { formatDataBR, formatMoedaBR, statusPagamentoExibicao } from "@/lib/status";
import Link from "next/link";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { personal } = await requirePersonal();
  const { aba = "a_receber" } = await searchParams;
  const supabase = await createClient();

  if (aba === "recebidos") {
    const { data: pagamentos } = await supabase
      .from("pagamentos")
      .select("*, alunos(nome)")
      .in(
        "aluno_id",
        (
          await supabase.from("alunos").select("id").eq("personal_id", personal.id)
        ).data?.map((a) => a.id) ?? []
      )
      .order("data_pagamento", { ascending: false })
      .limit(50);

    const total = (pagamentos ?? []).reduce((s, p) => s + Number(p.valor), 0);

    return (
      <div className="space-y-4 p-4 md:p-0">
        <h1 className="text-xl font-bold">Financeiro</h1>
        <Abas aba={aba} />
        <Card>
          <p className="text-xs text-muted">Total recebido (últimos registros)</p>
          <p className="text-2xl font-bold">{formatMoedaBR(total)}</p>
        </Card>
        <div className="space-y-2">
          {((pagamentos ?? []) as unknown as { id: string; valor: number; data_pagamento: string; forma_pagamento: string; alunos: { nome: string } | null }[]).map((p) => (
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
          {(!pagamentos || pagamentos.length === 0) && (
            <p className="text-sm text-muted">Nenhum pagamento registrado ainda.</p>
          )}
        </div>
      </div>
    );
  }

  const { data: alunos } = await supabase
    .from("alunos")
    .select("*")
    .eq("personal_id", personal.id)
    .eq("status", "ativo")
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

      <div className="space-y-2">
        {(alunos ?? []).map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between">
              <div>
                <Link href={`/alunos/${a.id}`} className="text-sm font-semibold">
                  {a.nome}
                </Link>
                <p className="text-xs text-muted">
                  {formatMoedaBR(a.pagamento_valor)} · vence {formatDataBR(a.pagamento_vencimento)}
                </p>
              </div>
              <Badge status={statusPagamentoExibicao(a)} />
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-medium text-primary">
                Marcar como pago
              </summary>
              <form action={marcarComoPago} className="mt-2 space-y-2">
                <input type="hidden" name="alunoId" value={a.id} />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.01"
                    name="valor"
                    required
                    defaultValue={a.pagamento_valor ?? ""}
                    placeholder="Valor"
                    className="h-10 rounded-lg border border-border px-2.5 text-sm"
                  />
                  <input
                    type="date"
                    name="dataPagamento"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="h-10 rounded-lg border border-border px-2.5 text-sm"
                  />
                </div>
                <select name="formaPagamento" required className="h-10 w-full rounded-lg border border-border px-2.5 text-sm">
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão">Cartão</option>
                  <option value="Transferência">Transferência</option>
                </select>
                <Button type="submit" size="sm" className="w-full">
                  Confirmar pagamento
                </Button>
              </form>
            </details>
          </Card>
        ))}
      </div>
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
