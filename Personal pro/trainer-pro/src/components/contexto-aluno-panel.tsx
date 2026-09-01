import { Card, CardTitle } from "@/components/ui/card";
import type { ContextoAluno } from "@/lib/data/contexto";
import { TrendingUp, AlertTriangle, ShieldAlert } from "lucide-react";
import { formatDataBR } from "@/lib/status";

export function ContextoAlunoPanel({ contexto }: { contexto: ContextoAluno }) {
  return (
    <Card>
      <CardTitle className="mb-3">Contexto do aluno</CardTitle>

      <div className="mb-4">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <TrendingUp size={13} /> Mais evolução de carga (30d)
        </p>
        {contexto.exerciciosEvoluindo.length ? (
          <ul className="space-y-1 text-sm">
            {contexto.exerciciosEvoluindo.map((e) => (
              <li key={e.nome} className="flex justify-between">
                <span>{e.nome}</span>
                <span className="font-medium text-success">+{e.percentual}%</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">Sem dados suficientes ainda.</p>
        )}
      </div>

      <div className="mb-4">
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <AlertTriangle size={13} /> Dor recente
        </p>
        {contexto.ticketsRecentes.length ? (
          <ul className="space-y-1.5 text-sm">
            {contexto.ticketsRecentes.map((t, i) => (
              <li key={i}>
                <span className="font-medium">{t.exercicioNome}</span>
                <span className="text-muted"> · {formatDataBR(t.data)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">Nenhum ticket recente.</p>
        )}
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <ShieldAlert size={13} /> Restrições/lesões
        </p>
        <p className="text-sm">{contexto.restricoes || "Nenhuma restrição registrada."}</p>
      </div>
    </Card>
  );
}
