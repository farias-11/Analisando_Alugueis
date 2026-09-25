import type { StatusCiclo } from "./types";

function partesDataBrasil(referencia: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referencia);
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)!.value);
  return { ano: valor("year"), mes: valor("month"), dia: valor("day") };
}

/** Data (YYYY-MM-DD) no calendário de Brasília — pra agrupar/rotular execuções
 * por "dia do treino" sem o mesmo bug de fatiar `data.slice(0,10)` cru (isso é
 * UTC: um treino feito às 22h-23h59 em SP já virou o dia seguinte em UTC, e
 * aparecia com a data errada). Ver inicioDoDiaBrasil acima pra mais contexto. */
export function diaBrasilISO(referencia: Date): string {
  const { ano, mes, dia } = partesDataBrasil(referencia);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Meia-noite de HOJE no horário de Brasília, como instante exato (não meia-
 * noite no fuso do servidor) — a Vercel roda em UTC, então "hoje" calculado
 * com new Date()+setHours(0,0,0,0) direto ficava até 3h deslocado do dia
 * real do aluno no Brasil (mesmo bug já visto aqui na saudação, ver
 * saudacaoPorHorario). Isso já causou treino registrado à noite contando
 * pro dia errado, e a rotação do "próximo treino" ficando presa num treino
 * que na visão do aluno já tinha sido concluído no dia anterior. */
export function inicioDoDiaBrasil(referencia: Date = new Date()): Date {
  const { ano, mes, dia } = partesDataBrasil(referencia);
  // meia-noite em SP = 03:00 UTC (UTC-3 fixo — Brasil não tem mais horário
  // de verão desde 2019, então essa conta não varia ao longo do ano)
  return new Date(Date.UTC(ano, mes - 1, dia, 3, 0, 0, 0));
}

/** Início (domingo 00:00, horário de Brasília) da semana civil atual — NÃO
 * "7 dias atrás": um treino feito quinta ou sexta continuava marcado como
 * "feito essa semana" na segunda-feira seguinte, porque só tinham passado
 * poucos dias, mesmo a semana civil já tendo virado no domingo. */
export function inicioDaSemanaAtualBrasil(referencia: Date = new Date()): Date {
  const { ano, mes, dia } = partesDataBrasil(referencia);
  // dia da semana é um fato de calendário (não depende de fuso horário)
  const diaDaSemana = new Date(ano, mes - 1, dia).getDay(); // 0 = domingo
  return new Date(Date.UTC(ano, mes - 1, dia - diaDaSemana, 3, 0, 0, 0));
}

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

/** "Bom dia"/"Boa tarde"/"Boa noite" sempre no horário de Brasília, não no
 * fuso do servidor — a Vercel roda em UTC, então usar new Date().getHours()
 * direto dava saudação errada (3h adiantada) pra quem tá no Brasil o dia
 * inteiro. Boa noite 18h-00h59, bom dia 01h-11h59, boa tarde 12h-17h59. */
export function saudacaoPorHorario(): "Bom dia" | "Boa tarde" | "Boa noite" {
  const hora = Number(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  ) % 24; // Intl às vezes devolve "24" pra meia-noite em vez de "00"

  if (hora >= 18 || hora < 1) return "Boa noite";
  if (hora < 12) return "Bom dia";
  return "Boa tarde";
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
