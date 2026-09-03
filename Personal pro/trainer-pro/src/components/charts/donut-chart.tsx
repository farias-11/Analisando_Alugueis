"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoedaBR } from "@/lib/status";

export interface DonutSlice {
  label: string;
  valor: number;
  cor: string;
}

// versão compacta ("R$ 24,8k") só pra caber no centro do donut — o valor
// exato já aparece na legenda e no tooltip ao lado.
function formatMoedaCompacta(valor: number): string {
  if (valor >= 1000) return `R$ ${(valor / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return formatMoedaBR(valor);
}

export function DonutChart({ data }: { data: DonutSlice[] }) {
  const total = data.reduce((s, d) => s + d.valor, 0);

  if (total <= 0) {
    return (
      <div className="flex h-28 items-center justify-center text-sm text-muted">
        Ainda sem pagamentos nesse período.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="valor" nameKey="label" innerRadius="62%" outerRadius="100%" paddingAngle={2} strokeWidth={0}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.cor} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [formatMoedaBR(Number(value)), name]}
              contentStyle={{ borderRadius: 12, borderColor: "var(--border)", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-foreground">{formatMoedaCompacta(total)}</span>
          <span className="text-[9px] text-muted">total do período</span>
        </div>
      </div>
      <div className="flex-1 space-y-1.5">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.cor }} />
              {d.label}
            </span>
            <span className="font-medium text-foreground">
              {formatMoedaBR(d.valor)} · {Math.round((d.valor / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
