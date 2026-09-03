"use client";

import { Download } from "lucide-react";

export interface LinhaExportavel {
  aluno: string;
  data: string;
  forma: string;
  valor: number;
}

export interface LinhaAReceberExportavel {
  aluno: string;
  vencimento: string | null;
  status: string;
  valor: number;
}

// Exportação simples (handoff, seção 4 — Financeiro): gera o CSV no próprio
// navegador a partir do que já está na tela, sem precisar de rota/endpoint
// novo — suficiente pro caso de uso ("levar pro contador"), sem pretensão de
// virar uma exportação fiscal completa.
//
// As colunas ficam fixas AQUI dentro (não vêm como prop de fora) porque essas
// funções de formatação seriam passadas de um Server Component pra este
// Client Component — e React não deixa função atravessar essa fronteira
// (mesma razão do comentário em simple-line-chart.tsx sobre a prop `moeda`).
function baixarCsv(cabecalho: string, linhas: string[], nomeArquivo: string) {
  const csv = `${cabecalho}\n${linhas.join("\n")}`;
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportarCsvButton({ linhas }: { linhas: LinhaExportavel[] }) {
  function exportar() {
    const corpo = linhas.map(
      (l) => `"${l.aluno.replace(/"/g, '""')}",${l.data},"${l.forma}",${l.valor.toFixed(2).replace(".", ",")}`
    );
    baixarCsv("Aluno,Data,Forma de pagamento,Valor", corpo, `pagamentos-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <button
      onClick={exportar}
      disabled={linhas.length === 0}
      className="flex items-center gap-1.5 rounded-pill border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-40"
    >
      <Download size={13} /> Exportar CSV
    </button>
  );
}

export function ExportarCsvButtonAReceber({ linhas }: { linhas: LinhaAReceberExportavel[] }) {
  function exportar() {
    const corpo = linhas.map(
      (l) =>
        `"${l.aluno.replace(/"/g, '""')}",${l.vencimento ?? ""},"${l.status}",${l.valor.toFixed(2).replace(".", ",")}`
    );
    baixarCsv("Aluno,Vencimento,Status,Valor", corpo, `a-receber-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <button
      onClick={exportar}
      disabled={linhas.length === 0}
      className="flex items-center gap-1.5 rounded-pill border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-40"
    >
      <Download size={13} /> Exportar CSV
    </button>
  );
}
