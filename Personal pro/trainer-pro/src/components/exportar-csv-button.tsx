"use client";

import { Download } from "lucide-react";

export interface LinhaExportavel {
  aluno: string;
  data: string;
  forma: string;
  valor: number;
}

// Exportação simples (handoff, seção 4 — Financeiro): gera o CSV no próprio
// navegador a partir do que já está na tela, sem precisar de rota/endpoint
// novo — suficiente pro caso de uso ("levar pro contador"), sem pretensão de
// virar uma exportação fiscal completa.
export function ExportarCsvButton({ linhas }: { linhas: LinhaExportavel[] }) {
  function exportar() {
    const cabecalho = "Aluno,Data,Forma de pagamento,Valor";
    const corpo = linhas
      .map((l) => `"${l.aluno.replace(/"/g, '""')}",${l.data},"${l.forma}",${l.valor.toFixed(2).replace(".", ",")}`)
      .join("\n");
    const csv = `${cabecalho}\n${corpo}`;
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagamentos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
