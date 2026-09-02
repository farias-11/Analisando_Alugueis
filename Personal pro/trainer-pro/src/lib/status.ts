import type { StatusCiclo } from "./types";

export function statusCiclo(dataFim: string): StatusCiclo {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(dataFim + "T00:00:00");
  const diasRestantes = Math.round((fim.getTime() - hoje.getTime()) / 86_400_000);

  if (diasRestantes < 0) return "vencido";
  if (diasRestantes <= 7) return "vencendo";
  return "ativo";
}

export function diasRestantes(dataFim: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fim = new Date(dataFim + "T00:00:00");
  return Math.round((fim.getTime() - hoje.getTime()) / 86_400_000);
}

export function diasDesde(data: string | null): number | null {
  if (!data) return null;
  const then = new Date(data);
  const now = new Date();
  return Math.floor((now.getTime() - then.getTime()) / 86_400_000);
}

export type Tendencia = "positiva" | "neutra" | "negativa";

export function corTendencia(t: Tendencia) {
  if (t === "positiva") return { text: "text-success", bg: "bg-success-soft", seta: "↓" };
  if (t === "negativa") return { text: "text-danger", bg: "bg-danger-soft", seta: "!" };
  return { text: "text-muted", bg: "bg-neutral-soft", seta: "–" };
}

export const STATUS_BADGE: Record<
  string,
  { label: string; text: string; bg: string }
> = {
  ativo: { label: "Ativo", text: "text-success", bg: "bg-success-soft" },
  vencendo: { label: "Vencendo", text: "text-warning", bg: "bg-warning-soft" },
  vencido: { label: "Vencido", text: "text-danger", bg: "bg-danger-soft" },
  em_dia: { label: "Em dia", text: "text-success", bg: "bg-success-soft" },
  atrasado: { label: "Atrasado", text: "text-danger", bg: "bg-danger-soft" },
  inativo: { label: "Inativo", text: "text-muted", bg: "bg-neutral-soft" },
  aberto: { label: "Aberto", text: "text-danger", bg: "bg-danger-soft" },
  resolvido: { label: "Resolvido", text: "text-success", bg: "bg-success-soft" },
  pendente: { label: "Convite pendente", text: "text-warning", bg: "bg-warning-soft" },
  aceito: { label: "Ativo", text: "text-success", bg: "bg-success-soft" },
  sem_registro: { label: "Sem pagamento", text: "text-muted", bg: "bg-neutral-soft" },
  free: { label: "Free", text: "text-primary-dark", bg: "bg-primary-soft" },
};

/** Um aluno recém-criado nasce com pagamento_status='em_dia' por padrão do banco,
 * mas isso não significa que ele já pagou algo — sem vencimento registrado, mostra
 * um estado neutro em vez de "Em dia" (que sugeriria pagamento em dia à toa).
 * Quem está no plano gratuito (valor 0) nunca terá vencimento mesmo — mostra
 * "Free" em vez de "Sem pagamento", que soaria como pendência. */
export function statusPagamentoExibicao(aluno: {
  pagamento_status: string;
  pagamento_vencimento: string | null;
  planoValor?: number | null;
}): string {
  if (aluno.planoValor === 0) return "free";
  if (!aluno.pagamento_vencimento) return "sem_registro";
  return aluno.pagamento_status;
}

export function formatDataBR(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  return d.toLocaleDateString("pt-BR");
}

export function formatMoedaBR(valor: number | null): string {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
