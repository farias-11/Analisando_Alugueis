import "server-only";
import { createClient } from "@/lib/supabase/server";
import { diasDesde, diasRestantes as calcDiasRestantes } from "@/lib/status";
import { buildWhatsappLink, mensagemCobranca } from "@/lib/whatsapp";

export type TipoRadar =
  | "pagamento_atrasado"
  | "ticket_aberto"
  | "ciclo_vencido"
  | "sem_checkin"
  | "avaliacao_pendente";

export interface ItemRadar {
  alunoId: string;
  alunoNome: string;
  tipo: TipoRadar;
  detalhe: string;
  diasEmAberto: number;
  acao: { label: string; href: string; externo?: boolean; formPedir?: boolean };
}

export interface CicloVencendoItem {
  alunoId: string;
  alunoNome: string;
  diasRestantes: number;
}

export interface DestaqueEvolucao {
  alunoId: string;
  alunoNome: string;
  fotoUrl: string | null;
  cargaDeltaPct: number;
}

export type Periodo = "semana" | "mes" | "ano";
export const PERIODOS: { valor: Periodo; label: string; dias: number }[] = [
  { valor: "mes", label: "Mês", dias: 30 },
  { valor: "semana", label: "Semana", dias: 7 },
  { valor: "ano", label: "Ano", dias: 365 },
];

export interface DashboardData {
  periodo: Periodo;
  radar: ItemRadar[];
  radarTotal: number;
  ciclosVencendo: CicloVencendoItem[];
  destaquesEvolucao: DestaqueEvolucao[];
  financeiroPeriodo: { recebido: number; recebidoTendenciaPct: number | null; emAberto: number };
  kpis: {
    alunosAtivos: number;
    alunosAtivosTendencia: number;
    treinosParaRevisar: number;
    aderenciaPct: number;
    aderenciaTendenciaPP: number | null;
    ticketsAbertos: number;
    ticketsTendenciaPct: number | null;
  };
}

// Peso por tipo de item — soma à urgência em dias, não substitui (handoff,
// seção 2.3: "urgência como fator primário, com peso adicional por tipo").
const PESO_TIPO: Record<TipoRadar, number> = {
  pagamento_atrasado: 30,
  ticket_aberto: 25,
  ciclo_vencido: 20,
  sem_checkin: 10,
  avaliacao_pendente: 5,
};

const MAX_ITENS_RADAR = 8;

export async function getDashboardData(personalId: string, periodo: Periodo = "semana"): Promise<DashboardData> {
  const supabase = await createClient();
  const diasPeriodo = PERIODOS.find((p) => p.valor === periodo)!.dias;

  const { data: alunos } = await supabase
    .from("alunos")
    .select(
      "id, nome, foto_url, whatsapp, status, status_convite, pagamento_status, pagamento_vencimento, pagamento_valor, data_inicio, anamnese_ativa, bioimpedancia_ativa, bioimpedancia_frequencia_dias, ultima_atualizacao_medidas, planos(valor)"
    )
    .eq("personal_id", personalId);

  type AlunoRadar = {
    id: string;
    nome: string;
    foto_url: string | null;
    whatsapp: string | null;
    status: string;
    status_convite: string;
    pagamento_status: string;
    pagamento_vencimento: string | null;
    pagamento_valor: number | null;
    data_inicio: string;
    anamnese_ativa: boolean;
    bioimpedancia_ativa: boolean;
    bioimpedancia_frequencia_dias: number | null;
    ultima_atualizacao_medidas: string | null;
    planos: { valor: number } | null;
  };
  const todosAlunos = ((alunos ?? []) as unknown as AlunoRadar[]).map((a) => ({
    ...a,
    planoValor: a.planos?.valor ?? null,
  }));
  // convite pendente = aluno nunca acessou o app — não conta como "ativo" pra
  // essas métricas (nem pagamento pendente, nem avaliação, nem aderência),
  // senão o dashboard cobra o personal por gente que ainda nem começou
  const alunosAtivos = todosAlunos.filter((a) => a.status === "ativo" && a.status_convite === "aceito");
  const alunoIds = alunosAtivos.map((a) => a.id);
  const idsOuVazio = alunoIds.length ? alunoIds : ["00000000-0000-0000-0000-000000000000"];
  const nomePorAluno = new Map(alunosAtivos.map((a) => [a.id, a.nome]));
  const fotoPorAluno = new Map(alunosAtivos.map((a) => [a.id, a.foto_url]));

  const comAnamnese = alunosAtivos.filter((a) => a.anamnese_ativa).map((a) => a.id);
  const comBio = alunosAtivos.filter((a) => a.bioimpedancia_ativa && a.bioimpedancia_frequencia_dias);

  const inicioPeriodo = new Date();
  inicioPeriodo.setDate(inicioPeriodo.getDate() - diasPeriodo);
  const inicioPeriodoStr = inicioPeriodo.toISOString().slice(0, 10);
  const inicioPeriodoAnterior = new Date();
  inicioPeriodoAnterior.setDate(inicioPeriodoAnterior.getDate() - diasPeriodo * 2);

  const [
    { data: ticketsAbertosData },
    { data: ticketsPeriodo },
    { data: ciclosAtivos },
    { data: anamneses },
    { data: bioUltimas },
    { data: pagamentosPeriodo },
  ] = await Promise.all([
    supabase.from("tickets").select("id, aluno_id, created_at").eq("status", "aberto").in("aluno_id", idsOuVazio),
    supabase
      .from("tickets")
      .select("created_at")
      .in("aluno_id", idsOuVazio)
      .gte("created_at", inicioPeriodoAnterior.toISOString()),
    supabase.from("ciclos").select("id, aluno_id, data_fim").eq("ativo", true).in("aluno_id", idsOuVazio),
    comAnamnese.length
      ? supabase.from("anamneses").select("aluno_id, concluida").in("aluno_id", comAnamnese)
      : Promise.resolve({ data: [] as { aluno_id: string; concluida: boolean }[] }),
    comBio.length
      ? supabase
          .from("bioimpedancias")
          .select("aluno_id, data")
          .in(
            "aluno_id",
            comBio.map((a) => a.id)
          )
          .order("data", { ascending: false })
      : Promise.resolve({ data: [] as { aluno_id: string; data: string }[] }),
    supabase
      .from("pagamentos")
      .select("valor, aluno_id, data_pagamento")
      .in("aluno_id", idsOuVazio)
      .gte("data_pagamento", inicioPeriodoAnterior.toISOString().slice(0, 10)),
  ]);

  // reaproveita os ciclos ativos já buscados acima em vez de consultar de
  // novo dentro de calcularAderenciaMedia
  const [aderenciaMedia, destaquesEvolucao] = await Promise.all([
    calcularAderenciaMedia(alunoIds, ciclosAtivos ?? [], diasPeriodo),
    calcularDestaquesEvolucao(alunoIds, nomePorAluno, fotoPorAluno),
  ]);

  const radar: ItemRadar[] = [];

  // --- pagamento atrasado ---
  for (const a of alunosAtivos) {
    if (a.planoValor === 0) continue; // plano gratuito nunca cobra, não entra no radar
    const semRegistro = !a.pagamento_vencimento;
    if (a.pagamento_status !== "atrasado" && !semRegistro) continue;
    const dias = semRegistro ? (diasDesde(a.data_inicio) ?? 0) : Math.max(0, -calcDiasRestantes(a.pagamento_vencimento!));
    radar.push({
      alunoId: a.id,
      alunoNome: a.nome,
      tipo: "pagamento_atrasado",
      detalhe: semRegistro
        ? "Nunca lançou um pagamento"
        : `${dias} dia${dias === 1 ? "" : "s"} em atraso · ${a.pagamento_valor ? `R$ ${Number(a.pagamento_valor).toFixed(2).replace(".", ",")}` : "valor não definido"}`,
      diasEmAberto: dias,
      acao: a.whatsapp
        ? {
            label: "Cobrar",
            href: buildWhatsappLink(a.whatsapp, mensagemCobranca({ alunoNome: a.nome, valor: a.pagamento_valor, vencimento: a.pagamento_vencimento })),
            externo: true,
          }
        : { label: "Cobrar", href: `/alunos/${a.id}?aba=geral` },
    });
  }

  // --- tickets de dor abertos ---
  for (const t of ticketsAbertosData ?? []) {
    const dias = diasDesde(t.created_at) ?? 0;
    radar.push({
      alunoId: t.aluno_id,
      alunoNome: nomePorAluno.get(t.aluno_id) ?? "Aluno",
      tipo: "ticket_aberto",
      detalhe: `Ticket aberto há ${dias} dia${dias === 1 ? "" : "s"}`,
      diasEmAberto: dias,
      acao: { label: "Responder", href: "/tickets" },
    });
  }

  // --- ciclos vencidos (radar) e vencendo dentro do período (faixa) ---
  let treinosParaRevisar = 0;
  const ciclosVencendo: CicloVencendoItem[] = [];
  for (const c of ciclosAtivos ?? []) {
    const restantes = calcDiasRestantes(c.data_fim);
    if (restantes < 0) {
      treinosParaRevisar++;
      radar.push({
        alunoId: c.aluno_id,
        alunoNome: nomePorAluno.get(c.aluno_id) ?? "Aluno",
        tipo: "ciclo_vencido",
        detalhe: `Ciclo vencido há ${Math.abs(restantes)} dia${Math.abs(restantes) === 1 ? "" : "s"}`,
        diasEmAberto: Math.abs(restantes),
        acao: { label: "Renovar", href: `/alunos/${c.aluno_id}/treino` },
      });
    } else if (restantes <= 7) {
      // fixo em 7 dias independente do período selecionado — é um aviso de
      // "vem chegando", não uma janela de relatório que faz sentido esticar
      // pro ano inteiro (aí mostraria todo mundo, perderia o propósito)
      ciclosVencendo.push({
        alunoId: c.aluno_id,
        alunoNome: nomePorAluno.get(c.aluno_id) ?? "Aluno",
        diasRestantes: restantes,
      });
    }
  }
  ciclosVencendo.sort((a, b) => a.diasRestantes - b.diasRestantes);

  // --- sem check-in (sem atualizar medidas) há 14+ dias ---
  for (const a of alunosAtivos) {
    const dias = diasDesde(a.ultima_atualizacao_medidas);
    if (dias === null || dias < 14) continue;
    radar.push({
      alunoId: a.id,
      alunoNome: a.nome,
      tipo: "sem_checkin",
      detalhe: `Sem atualizar medidas há ${dias} dias`,
      diasEmAberto: dias,
      acao: a.whatsapp
        ? { label: "Chamar", href: buildWhatsappLink(a.whatsapp, `Oi ${a.nome.split(" ")[0]}! Faz um tempo que você não atualiza seus dados no Duo Flow — tudo certo?`), externo: true }
        : { label: "Chamar", href: `/alunos/${a.id}?aba=geral` },
    });
  }

  // --- avaliações pendentes (anamnese ou bioimpedância vencida) ---
  const anamnesePendentePorAluno = new Set<string>();
  if (comAnamnese.length) {
    const concluidas = new Set((anamneses ?? []).filter((a) => a.concluida).map((a) => a.aluno_id));
    for (const id of comAnamnese) if (!concluidas.has(id)) anamnesePendentePorAluno.add(id);
  }
  const bioPendentePorAluno = new Set<string>();
  if (comBio.length) {
    const ultimaPorAluno = new Map<string, string>();
    for (const b of bioUltimas ?? []) {
      if (!ultimaPorAluno.has(b.aluno_id)) ultimaPorAluno.set(b.aluno_id, b.data);
    }
    for (const a of comBio) {
      const ultima = ultimaPorAluno.get(a.id);
      const dias = ultima ? diasDesde(ultima) : null;
      if (dias === null || (a.bioimpedancia_frequencia_dias && dias >= a.bioimpedancia_frequencia_dias)) {
        bioPendentePorAluno.add(a.id);
      }
    }
  }
  for (const a of alunosAtivos) {
    const anamnesePendente = anamnesePendentePorAluno.has(a.id);
    const bioPendente = bioPendentePorAluno.has(a.id);
    if (!anamnesePendente && !bioPendente) continue;
    radar.push({
      alunoId: a.id,
      alunoNome: a.nome,
      tipo: "avaliacao_pendente",
      detalhe: anamnesePendente && bioPendente ? "Anamnese e bioimpedância pendentes" : anamnesePendente ? "Anamnese pendente" : "Bioimpedância vencida",
      diasEmAberto: diasDesde(a.ultima_atualizacao_medidas) ?? 0,
      acao: { label: "Pedir", href: `/alunos/${a.id}?aba=geral`, formPedir: true },
    });
  }

  // ordena por urgência (dias + peso do tipo) e corta pro topo — o resto dá
  // pra ver filtrando em "Alunos" (link "Ver todos" na UI)
  radar.sort((a, b) => b.diasEmAberto + PESO_TIPO[b.tipo] - (a.diasEmAberto + PESO_TIPO[a.tipo]));
  const radarTotal = radar.length;
  const radarTopo = radar.slice(0, MAX_ITENS_RADAR);

  const recebido = (pagamentosPeriodo ?? [])
    .filter((p) => p.data_pagamento >= inicioPeriodoStr)
    .reduce((s, p) => s + Number(p.valor), 0);
  const recebidoAnterior = (pagamentosPeriodo ?? [])
    .filter((p) => p.data_pagamento < inicioPeriodoStr)
    .reduce((s, p) => s + Number(p.valor), 0);
  const recebidoTendenciaPct =
    recebidoAnterior > 0 ? Math.round(((recebido - recebidoAnterior) / recebidoAnterior) * 100) : null;
  const emAberto = alunosAtivos
    .filter((a) => a.pagamento_status === "atrasado")
    .reduce((s, a) => s + Number(a.pagamento_valor ?? 0), 0);

  // tickets: volume de novos tickets no período vs período anterior (não dá
  // pra saber quantos estavam ABERTOS num ponto passado sem um snapshot
  // histórico — isso aqui mede o fluxo de entrada, que é o que dá pra provar
  // com o que já existe: created_at de verdade, sem inventar número)
  const inicioPeriodoAnteriorStr = inicioPeriodoAnterior.toISOString().slice(0, 10);
  const ticketsNoPeriodo = (ticketsPeriodo ?? []).filter((t) => t.created_at >= inicioPeriodo.toISOString()).length;
  const ticketsNoPeriodoAnterior = (ticketsPeriodo ?? []).filter(
    (t) => t.created_at < inicioPeriodo.toISOString() && t.created_at >= inicioPeriodoAnteriorStr
  ).length;
  const ticketsTendenciaPct =
    ticketsNoPeriodoAnterior > 0
      ? Math.round(((ticketsNoPeriodo - ticketsNoPeriodoAnterior) / ticketsNoPeriodoAnterior) * 100)
      : null;

  // alunos ativos entrados no período (data_inicio é fixo por aluno, nunca
  // é substituído como um ciclo — ao contrário de "treinos p/ revisar", dá
  // pra reconstruir essa contagem de forma confiável a partir do que já
  // existe. É contagem de entradas, não delta líquido (não detecta quem
  // saiu), mas é o que dá pra provar sem inventar número.
  const alunosAtivosTendencia = alunosAtivos.filter((a) => a.data_inicio >= inicioPeriodoStr).length;

  return {
    periodo,
    radar: radarTopo,
    radarTotal,
    ciclosVencendo,
    destaquesEvolucao,
    financeiroPeriodo: { recebido, recebidoTendenciaPct, emAberto },
    kpis: {
      alunosAtivos: alunosAtivos.length,
      alunosAtivosTendencia,
      treinosParaRevisar,
      aderenciaPct: aderenciaMedia.atual,
      aderenciaTendenciaPP: aderenciaMedia.tendenciaPP,
      ticketsAbertos: (ticketsAbertosData ?? []).length,
      ticketsTendenciaPct,
    },
  };
}

/** Top 3 alunos por evolução de carga no período — versão batched (2 queries
 * no total, não 1 por aluno) pra não repetir o N+1 que essa mesma conta já
 * teve antes. */
async function calcularDestaquesEvolucao(
  alunoIds: string[],
  nomePorAluno: Map<string, string>,
  fotoPorAluno: Map<string, string | null>
): Promise<DestaqueEvolucao[]> {
  if (alunoIds.length === 0) return [];
  const supabase = await createClient();
  const trintaDiasAtras = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const sessentaDiasAtras = new Date(Date.now() - 60 * 86_400_000).toISOString();

  const [{ data: execAtual }, { data: execAnterior }] = await Promise.all([
    supabase.from("execucoes").select("aluno_id, carga").in("aluno_id", alunoIds).gte("data", trintaDiasAtras).not("carga", "is", null),
    supabase
      .from("execucoes")
      .select("aluno_id, carga")
      .in("aluno_id", alunoIds)
      .gte("data", sessentaDiasAtras)
      .lt("data", trintaDiasAtras)
      .not("carga", "is", null),
  ]);

  const somaPorAluno = (rows: { aluno_id: string; carga: number | null }[] | null) => {
    const soma = new Map<string, { total: number; qtd: number }>();
    for (const r of rows ?? []) {
      const atual = soma.get(r.aluno_id) ?? { total: 0, qtd: 0 };
      atual.total += Number(r.carga);
      atual.qtd += 1;
      soma.set(r.aluno_id, atual);
    }
    return soma;
  };

  const mediaAtualPorAluno = somaPorAluno(execAtual);
  const mediaAnteriorPorAluno = somaPorAluno(execAnterior);

  const destaques: DestaqueEvolucao[] = [];
  for (const alunoId of alunoIds) {
    const atual = mediaAtualPorAluno.get(alunoId);
    const anterior = mediaAnteriorPorAluno.get(alunoId);
    if (!atual || !anterior || anterior.total <= 0) continue;
    const mediaAtual = atual.total / atual.qtd;
    const mediaAnterior = anterior.total / anterior.qtd;
    const deltaPct = ((mediaAtual - mediaAnterior) / mediaAnterior) * 100;
    if (deltaPct <= 0) continue;
    destaques.push({
      alunoId,
      alunoNome: nomePorAluno.get(alunoId) ?? "Aluno",
      fotoUrl: fotoPorAluno.get(alunoId) ?? null,
      cargaDeltaPct: Math.round(deltaPct),
    });
  }

  return destaques.sort((a, b) => b.cargaDeltaPct - a.cargaDeltaPct).slice(0, 3);
}

async function calcularAderenciaMedia(
  alunoIds: string[],
  ciclos: { id: string; aluno_id: string }[],
  diasJanela: number
): Promise<{ atual: number; tendenciaPP: number | null }> {
  if (alunoIds.length === 0 || ciclos.length === 0) return { atual: 0, tendenciaPP: null };
  const supabase = await createClient();
  const inicioJanela = new Date(Date.now() - diasJanela * 86_400_000);
  const inicioJanelaAnterior = new Date(Date.now() - diasJanela * 2 * 86_400_000);

  // aulas do ciclo e execuções da janela (atual + anterior) não dependem uma
  // da outra — rodam em paralelo. Busca 2x a janela pra calcular a tendência
  // sem uma segunda ida ao banco.
  const [{ data: aulas }, { data: execs }] = await Promise.all([
    supabase
      .from("aulas")
      .select("id, ciclo_id")
      .in(
        "ciclo_id",
        ciclos.map((c) => c.id)
      ),
    supabase
      .from("execucoes")
      .select("aluno_id, data, aula_exercicios(aula_id)")
      .in("aluno_id", alunoIds)
      .gte("data", inicioJanelaAnterior.toISOString()),
  ]);

  const aulasPorCiclo = new Map<string, number>();
  for (const a of aulas ?? []) {
    aulasPorCiclo.set(a.ciclo_id, (aulasPorCiclo.get(a.ciclo_id) ?? 0) + 1);
  }

  // sessões (aula x dia) separadas por janela — atual e anterior — não só
  // quais aulas já foram feitas alguma vez, senão o teto ficaria baixo
  // independente de quanto o aluno treina
  const sessoesAtualPorAluno = new Map<string, Set<string>>();
  const sessoesAnteriorPorAluno = new Map<string, Set<string>>();
  for (const e of (execs ?? []) as unknown as {
    aluno_id: string;
    data: string;
    aula_exercicios: { aula_id: string } | null;
  }[]) {
    const aulaId = e.aula_exercicios?.aula_id;
    if (!aulaId) continue;
    const dataExec = new Date(e.data);
    const chave = `${aulaId}_${e.data.slice(0, 10)}`;
    const mapa = dataExec >= inicioJanela ? sessoesAtualPorAluno : sessoesAnteriorPorAluno;
    const set = mapa.get(e.aluno_id) ?? new Set<string>();
    set.add(chave);
    mapa.set(e.aluno_id, set);
  }

  const percentual = (sessoesPorAluno: Map<string, Set<string>>) => {
    const valores = ciclos.map((c) => {
      const metaSessoes = Math.max((aulasPorCiclo.get(c.id) ?? 0) * (diasJanela / 7), 1);
      const feitas = sessoesPorAluno.get(c.aluno_id)?.size ?? 0;
      return Math.min(100, (feitas / metaSessoes) * 100);
    });
    return Math.round(valores.reduce((s, p) => s + p, 0) / valores.length);
  };

  const atual = percentual(sessoesAtualPorAluno);
  // só mostra tendência se havia alguma sessão na janela anterior — senão um
  // aluno que só começou recentemente faria a "queda" parecer maior do que é
  const houveSessaoAnterior = Array.from(sessoesAnteriorPorAluno.values()).some((s) => s.size > 0);
  const tendenciaPP = houveSessaoAnterior ? atual - percentual(sessoesAnteriorPorAluno) : null;

  return { atual, tendenciaPP };
}
