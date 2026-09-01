import { corTendencia, type Tendencia } from "@/lib/status";
import type { ResumoEvolucao } from "@/lib/data/evolucao";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

function SetaTendencia({ tendencia }: { tendencia: Tendencia }) {
  if (tendencia === "positiva") return <ArrowDown size={14} />;
  if (tendencia === "negativa") return <ArrowUp size={14} />;
  return <Minus size={14} />;
}

export function EvolutionSummary({ resumo }: { resumo: ResumoEvolucao }) {
  const peso = corTendencia(resumo.pesoTendencia);
  const carga = corTendencia(resumo.cargaTendencia);
  const aderencia = corTendencia(resumo.aderenciaTendencia);

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className={`rounded-xl p-3 ${peso.bg}`}>
        <p className="text-[11px] font-medium text-muted">Peso · 30d</p>
        <p className={`mt-1 flex items-center gap-1 text-sm font-semibold ${peso.text}`}>
          {resumo.pesoDeltaKg === null ? "—" : `${resumo.pesoDeltaKg > 0 ? "+" : ""}${resumo.pesoDeltaKg.toFixed(1)}kg`}
          {resumo.pesoDeltaKg !== null && <SetaTendencia tendencia={resumo.pesoTendencia} />}
        </p>
      </div>
      <div className={`rounded-xl p-3 ${carga.bg}`}>
        <p className="text-[11px] font-medium text-muted">Carga média</p>
        <p className={`mt-1 flex items-center gap-1 text-sm font-semibold ${carga.text}`}>
          {resumo.cargaDeltaPct === null ? "—" : `${resumo.cargaDeltaPct > 0 ? "+" : ""}${resumo.cargaDeltaPct.toFixed(0)}%`}
        </p>
      </div>
      <div className={`rounded-xl p-3 ${aderencia.bg}`}>
        <p className="text-[11px] font-medium text-muted">Aderência</p>
        <p className={`mt-1 text-sm font-semibold ${aderencia.text}`}>{resumo.aderenciaPct}%</p>
      </div>
    </div>
  );
}
