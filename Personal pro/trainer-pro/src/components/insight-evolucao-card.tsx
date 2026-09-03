import { cn } from "@/lib/utils";
import type { InsightEvolucao } from "@/lib/insight-evolucao";

export function InsightEvolucaoCard({ insight, className = "mt-3" }: { insight: InsightEvolucao; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl bg-neutral-soft px-3.5 py-3", className)}>
      <span className="text-xl leading-none">{insight.emoji}</span>
      <p className="text-sm font-medium text-foreground">{insight.frase}</p>
    </div>
  );
}
