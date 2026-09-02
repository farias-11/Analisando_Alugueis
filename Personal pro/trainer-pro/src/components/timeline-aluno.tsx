import { formatDataBR } from "@/lib/status";
import type { EventoTimeline, TipoEventoTimeline } from "@/lib/data/timeline";
import { CheckCircle2, CreditCard, HeartPulse, Layers, MessageCircleWarning, Ruler, FileCheck } from "lucide-react";

const ICONE_TIPO: Record<TipoEventoTimeline, typeof CreditCard> = {
  pagamento: CreditCard,
  ciclo: Layers,
  ticket_aberto: MessageCircleWarning,
  ticket_resolvido: CheckCircle2,
  medida: Ruler,
  anamnese: FileCheck,
  bioimpedancia: HeartPulse,
};

const COR_TIPO: Record<TipoEventoTimeline, string> = {
  pagamento: "text-success bg-success-soft",
  ciclo: "text-primary bg-primary-soft",
  ticket_aberto: "text-danger bg-danger-soft",
  ticket_resolvido: "text-success bg-success-soft",
  medida: "text-foreground bg-neutral-soft",
  anamnese: "text-foreground bg-neutral-soft",
  bioimpedancia: "text-foreground bg-neutral-soft",
};

export function TimelineAluno({ eventos }: { eventos: EventoTimeline[] }) {
  if (eventos.length === 0) {
    return <p className="text-sm text-muted">Nenhum evento registrado ainda.</p>;
  }

  return (
    <div className="space-y-3">
      {eventos.map((ev, i) => {
        const Icone = ICONE_TIPO[ev.tipo];
        return (
          <div key={i} className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${COR_TIPO[ev.tipo]}`}>
              <Icone size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{ev.titulo}</p>
                <p className="shrink-0 text-xs text-muted">{formatDataBR(ev.data)}</p>
              </div>
              {ev.detalhe && <p className="truncate text-xs text-muted">{ev.detalhe}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
