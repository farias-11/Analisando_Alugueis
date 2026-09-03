"use client";

import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoedaBR } from "@/lib/status";

export interface DualBarPoint {
  data: string; // rótulo curto, ex: "mar/26" ou "jan"
  a: number;
  b: number;
}

export function DualBarChart({
  data,
  labelA,
  labelB,
  colorA = "var(--primary)",
  colorB = "var(--muted-2)",
}: {
  data: DualBarPoint[];
  labelA: string;
  labelB: string;
  colorA?: string;
  colorB?: string;
}) {
  const temAlgumValor = data.some((d) => d.a > 0 || d.b > 0);

  if (data.length === 0 || !temAlgumValor) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted">
        Ainda sem dados suficientes para gerar o gráfico.
      </div>
    );
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barGap={3}>
          <XAxis
            dataKey="data"
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={8}
          />
          <YAxis hide domain={[0, "auto"]} />
          <Tooltip
            formatter={(value, name) => [formatMoedaBR(Number(value)), name]}
            labelStyle={{ fontSize: 11 }}
            contentStyle={{ borderRadius: 12, borderColor: "var(--border)", fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
          <Bar dataKey="a" name={labelA} fill={colorA} radius={[4, 4, 0, 0]} maxBarSize={22} />
          <Bar dataKey="b" name={labelB} fill={colorB} radius={[4, 4, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
