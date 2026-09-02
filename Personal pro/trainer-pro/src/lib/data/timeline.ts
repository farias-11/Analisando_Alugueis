import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formatMoedaBR } from "@/lib/status";

export type TipoEventoTimeline =
  | "pagamento"
  | "ciclo"
  | "ticket_aberto"
  | "ticket_resolvido"
  | "medida"
  | "anamnese"
  | "bioimpedancia";

export interface EventoTimeline {
  tipo: TipoEventoTimeline;
  data: string;
  titulo: string;
  detalhe?: string;
}

const LIMITE_POR_FONTE = 6;
const LIMITE_TOTAL = 15;

/** Timeline unificada da Ficha do aluno (handoff, seção 4 — Geral): junta os
 * eventos que hoje ficam espalhados em abas diferentes (pagamento, ciclo,
 * ticket, medida, avaliação) numa lista só, mais recente primeiro. Não cria
 * uma tabela de eventos nova — busca uma fatia recente de cada fonte já
 * existente e ordena tudo junto em memória, simples o bastante pro volume
 * de um aluno individual. */
export async function getTimelineAluno(alunoId: string): Promise<EventoTimeline[]> {
  const supabase = await createClient();

  const [{ data: pagamentos }, { data: ciclos }, { data: tickets }, { data: medidas }, { data: anamnese }, { data: bioimpedancias }] =
    await Promise.all([
      supabase
        .from("pagamentos")
        .select("data_pagamento, valor, forma_pagamento")
        .eq("aluno_id", alunoId)
        .order("data_pagamento", { ascending: false })
        .limit(LIMITE_POR_FONTE),
      supabase
        .from("ciclos")
        .select("created_at, duracao_semanas")
        .eq("aluno_id", alunoId)
        .order("created_at", { ascending: false })
        .limit(LIMITE_POR_FONTE),
      supabase
        .from("tickets")
        .select("created_at, resolvido_em, exercicio_nome, status")
        .eq("aluno_id", alunoId)
        .order("created_at", { ascending: false })
        .limit(LIMITE_POR_FONTE),
      supabase
        .from("medidas")
        .select("data, peso")
        .eq("aluno_id", alunoId)
        .order("data", { ascending: false })
        .limit(LIMITE_POR_FONTE),
      supabase.from("anamneses").select("data_preenchimento, concluida").eq("aluno_id", alunoId).maybeSingle(),
      supabase
        .from("bioimpedancias")
        .select("data, peso")
        .eq("aluno_id", alunoId)
        .order("data", { ascending: false })
        .limit(LIMITE_POR_FONTE),
    ]);

  const eventos: EventoTimeline[] = [];

  for (const p of pagamentos ?? []) {
    eventos.push({
      tipo: "pagamento",
      data: p.data_pagamento,
      titulo: "Pagamento registrado",
      detalhe: `${formatMoedaBR(p.valor)} · ${p.forma_pagamento}`,
    });
  }

  for (const c of ciclos ?? []) {
    eventos.push({
      tipo: "ciclo",
      data: c.created_at,
      titulo: "Ciclo de treino iniciado",
      detalhe: `${c.duracao_semanas} semanas`,
    });
  }

  for (const t of tickets ?? []) {
    eventos.push({ tipo: "ticket_aberto", data: t.created_at, titulo: "Relato de dor/desconforto", detalhe: t.exercicio_nome });
    if (t.status === "resolvido" && t.resolvido_em) {
      eventos.push({ tipo: "ticket_resolvido", data: t.resolvido_em, titulo: "Ticket resolvido", detalhe: t.exercicio_nome });
    }
  }

  for (const m of medidas ?? []) {
    eventos.push({
      tipo: "medida",
      data: m.data,
      titulo: "Medidas atualizadas",
      detalhe: m.peso ? `${m.peso}kg` : undefined,
    });
  }

  if (anamnese?.concluida && anamnese.data_preenchimento) {
    eventos.push({ tipo: "anamnese", data: anamnese.data_preenchimento, titulo: "Anamnese preenchida" });
  }

  for (const b of bioimpedancias ?? []) {
    eventos.push({
      tipo: "bioimpedancia",
      data: b.data,
      titulo: "Bioimpedância registrada",
      detalhe: b.peso ? `${b.peso}kg` : undefined,
    });
  }

  return eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, LIMITE_TOTAL);
}
