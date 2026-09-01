"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ChartPoint {
  data: string; // rótulo curto, ex: "22/04"
  valor: number;
}

export function SimpleLineChart({
  data,
  color = "var(--primary)",
  unidade = "",
}: {
  data: ChartPoint[];
  color?: string;
  unidade?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted">
        Ainda sem dados suficientes para gerar o gráfico.
      </div>
    );
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="data"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            minTickGap={24}
          />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value) => [`${value}${unidade}`, ""]}
            contentStyle={{ borderRadius: 12, borderColor: "var(--border)", fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="valor"
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
