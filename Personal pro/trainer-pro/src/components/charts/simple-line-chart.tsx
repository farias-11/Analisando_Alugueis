"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";

export interface ChartPoint {
  data: string; // rótulo curto, ex: "22/04"
  valor: number;
}

export function SimpleLineChart({
  data,
  color = "var(--primary)",
  unidade = "",
  tendenciaDelta = "neutro",
  formatarValor,
}: {
  data: ChartPoint[];
  color?: string;
  unidade?: string;
  /** cor do badge de delta: carga (mais é sempre progresso) usa "maior_melhor";
   * peso/% gordura ficam "neutro" porque depende do objetivo do aluno (emagrecer
   * vs. hipertrofia) — não dá pra assumir que subir ou cair é "bom" sem saber. */
  tendenciaDelta?: "maior_melhor" | "menor_melhor" | "neutro";
  /** pra casos como R$, onde a unidade vem antes do número, não depois —
   * quando ausente, mantém o comportamento padrão (número + unidade). */
  formatarValor?: (v: number) => string;
}) {
  const gradientId = useId();
  const fmt = formatarValor ?? ((v: number) => `${v}${unidade}`);

  if (data.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center text-sm text-muted">
        Ainda sem dados suficientes para gerar o gráfico.
      </div>
    );
  }

  const ultimo = data[data.length - 1].valor;
  const penultimo = data.length >= 2 ? data[data.length - 2].valor : null;
  const delta = penultimo !== null ? ultimo - penultimo : null;
  const deltaPositivo = delta !== null && delta > 0;
  const deltaNegativo = delta !== null && delta < 0;
  const deltaBom =
    tendenciaDelta === "neutro"
      ? null
      : tendenciaDelta === "menor_melhor"
        ? deltaNegativo
        : deltaPositivo;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold tabular-nums">
            {formatarValor ? fmt(ultimo) : ultimo}
            {!formatarValor && <span className="ml-0.5 text-sm font-medium text-muted">{unidade}</span>}
          </p>
          <p className="text-xs text-muted">Mais recente · {data[data.length - 1].data}</p>
        </div>
        {delta !== null && delta !== 0 && (
          <span
            className={`flex items-center gap-0.5 rounded-pill px-2 py-1 text-xs font-semibold ${
              deltaBom === null
                ? "bg-neutral-soft text-foreground"
                : deltaBom
                  ? "bg-success-soft text-success"
                  : "bg-danger-soft text-danger"
            }`}
          >
            {deltaPositivo ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {formatarValor ? fmt(Math.abs(delta)) : `${Math.abs(delta).toFixed(1)}${unidade}`}
          </span>
        )}
      </div>

      {data.length === 1 ? (
        <div className="flex h-16 items-center rounded-xl bg-neutral-soft px-3 text-xs text-muted">
          Registre mais uma medida pra começar a ver sua evolução aqui.
        </div>
      ) : (
        <div className="h-28 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10, fill: "var(--muted)" }}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis hide domain={["auto", "auto"]} />
              <Tooltip
                formatter={(value) => [fmt(Number(value)), ""]}
                labelStyle={{ fontSize: 11 }}
                contentStyle={{ borderRadius: 12, borderColor: "var(--border)", fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="valor"
                stroke={color}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
