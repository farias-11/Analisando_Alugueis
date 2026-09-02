"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusPagamentoExibicao, formatDataBR, formatMoedaBR } from "@/lib/status";
import { marcarComoPago, marcarVariosComoPago } from "@/app/actions/alunos";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { Aluno } from "@/lib/types";

/** Mesma ideia de AlunosListaSelecionavel, adaptada pro Financeiro: seleção
 * múltipla + barra de ação em lote pra "marcar como pago" rápido, sem perder
 * o fluxo individual (com valor/forma ajustáveis) que já existia por aluno. */
export function FinanceiroListaSelecionavel({
  alunos,
}: {
  alunos: (Aluno & { planoValor: number | null })[];
}) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function marcarSelecionadosComoPago() {
    const fd = new FormData();
    selecionados.forEach((id) => fd.append("alunoIds", id));
    startTransition(async () => {
      await marcarVariosComoPago(fd);
      setSelecionados(new Set());
    });
  }

  return (
    <div className={selecionados.size > 0 ? "pb-20" : undefined}>
      <div className="space-y-2">
        {alunos.map((a) => {
          const marcado = selecionados.has(a.id);
          return (
            <Card key={a.id} className={marcado ? "ring-2 ring-primary" : undefined}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={marcado}
                    onChange={() => alternar(a.id)}
                    className="h-4.5 w-4.5 shrink-0 rounded border-border accent-primary"
                  />
                  <div className="min-w-0">
                    <Link href={`/alunos/${a.id}`} className="text-sm font-semibold">
                      {a.nome}
                    </Link>
                    <p className="text-xs text-muted">
                      {formatMoedaBR(a.pagamento_valor)} · vence {formatDataBR(a.pagamento_vencimento)}
                    </p>
                  </div>
                </div>
                <Badge status={statusPagamentoExibicao(a)} />
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-primary">Marcar como pago</summary>
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
          );
        })}
        {alunos.length === 0 && <p className="text-sm text-muted">Nenhum aluno ativo no momento.</p>}
      </div>

      {selecionados.size > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-4 md:bottom-4">
          <div className="flex w-full max-w-lg items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-lg">
            <span className="shrink-0 pl-2 text-xs font-semibold text-foreground">
              {selecionados.size} selecionado{selecionados.size > 1 ? "s" : ""}
            </span>
            <div className="flex flex-1 justify-end">
              <button
                onClick={marcarSelecionadosComoPago}
                disabled={pending}
                className="flex items-center gap-1 rounded-pill bg-success-soft px-2.5 py-1.5 text-xs font-semibold text-success disabled:opacity-50"
              >
                {pending ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Marcar como pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
