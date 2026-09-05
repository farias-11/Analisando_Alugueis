"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { statusPagamentoExibicao } from "@/lib/status";
import { marcarVariosComoPago, enviarLembreteEmLote } from "@/app/actions/alunos";
import { renovarCiclosEmLote } from "@/app/actions/treinos";
import { CheckCircle2, RefreshCw, Bell, Loader2 } from "lucide-react";
import type { AlunoComTreino } from "@/lib/data/alunos";

/** Lista de alunos com seleção múltipla e barra de ação em lote (handoff,
 * seção 3.1) — reaproveita o mesmo card visual de antes, só adiciona o
 * checkbox (que intercepta o clique pra não navegar pra ficha) e a barra
 * fixa no rodapé quando há seleção. */
export function AlunosListaSelecionavel({ alunos }: { alunos: AlunoComTreino[] }) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [acaoEmCurso, setAcaoEmCurso] = useState<string | null>(null);

  function alternar(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function limpar() {
    setSelecionados(new Set());
  }

  async function executar(nome: string, acao: (fd: FormData) => Promise<void>) {
    const fd = new FormData();
    selecionados.forEach((id) => fd.append("alunoIds", id));
    setAcaoEmCurso(nome);
    startTransition(async () => {
      await acao(fd);
      setAcaoEmCurso(null);
      limpar();
    });
  }

  return (
    <div className={selecionados.size > 0 ? "pb-20" : undefined}>
      <div className="space-y-2">
        {alunos.map((aluno) => {
          const marcado = selecionados.has(aluno.id);
          return (
            <Card key={aluno.id} className={`flex items-center gap-3 ${marcado ? "ring-2 ring-primary" : ""}`}>
              <label
                className="flex h-6 w-6 shrink-0 items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => alternar(aluno.id)}
                  className="h-4.5 w-4.5 rounded border-border accent-primary"
                />
              </label>
              <Link href={`/alunos/${aluno.id}`} className="flex flex-1 items-center gap-3 overflow-hidden">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-primary-soft">
                  {aluno.foto_url ? (
                    <Image src={aluno.foto_url} alt={aluno.nome} fill sizes="44px" className="object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary-dark">
                      {aluno.nome.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{aluno.nome}</p>
                    {aluno.status === "inativo" && <Badge status="inativo" />}
                  </div>
                  <p className="truncate text-xs text-muted">{aluno.objetivo || "Sem objetivo definido"}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge status={aluno.status_convite === "pendente" ? "pendente" : statusPagamentoExibicao(aluno)} />
                  {aluno.statusTreino && <Badge status={aluno.statusTreino} />}
                </div>
              </Link>
            </Card>
          );
        })}
        {alunos.length === 0 && <p className="px-1 text-sm text-muted">Nenhum aluno encontrado.</p>}
      </div>

      {selecionados.size > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-30 flex justify-center px-4 md:bottom-4">
          <div className="flex w-full max-w-lg items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-lg">
            <span className="shrink-0 pl-2 text-xs font-semibold text-foreground">
              {selecionados.size} selecionado{selecionados.size > 1 ? "s" : ""}
            </span>
            <div className="flex flex-1 justify-end gap-1.5 overflow-x-auto">
              <button
                onClick={() => executar("pago", marcarVariosComoPago)}
                disabled={pending}
                className="flex shrink-0 items-center gap-1 rounded-pill bg-success-soft px-2.5 py-1.5 text-xs font-semibold text-success disabled:opacity-50"
              >
                {pending && acaoEmCurso === "pago" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Marcar como pago
              </button>
              <button
                onClick={() => executar("renovar", renovarCiclosEmLote)}
                disabled={pending}
                className="flex shrink-0 items-center gap-1 rounded-pill bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary-dark disabled:opacity-50"
              >
                {pending && acaoEmCurso === "renovar" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Renovar ciclo
              </button>
              <button
                onClick={() => executar("lembrete", enviarLembreteEmLote)}
                disabled={pending}
                className="flex shrink-0 items-center gap-1 rounded-pill bg-warning-soft px-2.5 py-1.5 text-xs font-semibold text-warning disabled:opacity-50"
              >
                {pending && acaoEmCurso === "lembrete" ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
                Enviar lembrete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
