import "server-only";
import { createClient } from "@/lib/supabase/server";
import { statusCiclo, diasDesde, diasRestantes as calcDiasRestantes } from "@/lib/status";
import { buildWhatsappLink, mensagemCobranca } from "@/lib/whatsapp";
import { getResumoEvolucao } from "@/lib/data/evolucao";

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
  cargaDeltaPct: number;
}

export interface DashboardData {
  fraseAbertura: string;
  radar: ItemRadar[];
  radarTotal: number;
  ciclosVencendoSemana: CicloVencendoItem[];
  financeiroSemana: { recebidoSemana: number; emAberto: number };
  destaquesEvolucao: DestaqueEvolucao[];
  resumo: {
    alunosAtivos: number;
    treinosConcluidosHoje: number;
    aderenciaMedia: number;
    /** pontos percentuais vs. os 30 dias anteriores — null quando não dá pra
     * comparar (sem ciclo/execução suficiente no período anterior). Only
     * este indicador ganhou tendência nesta rodada (handoff 2.2): os outros
     * (alunos ativos, treinos hoje) exigiriam guardar um snapshot histórico
     * à parte pra comparar "de verdade", o que fica pra uma v2. */
    aderenciaTendenciaPP: number | null;
  };
}

// Peso por tipo de item — soma à urgência em dias, não substitui (handoff,
// seção 2.3: "urgência como fator primário, com peso adicional por tipo").
// Escolha simples pra v1: pagamento > ticket > ciclo vencido > sem check-in >
// avaliação pendente. Ajustável sem quebrar nada — é só esse mapa.
const PESO_TIPO: Record<TipoRadar, number> = {
  pagamento_atrasado: 30,
  ticket_aberto: 25,
  ciclo_vencido: 20,
  sem_checkin: 10,
  avaliacao_pendente: 5,
};

const MAX_ITENS_RADAR = 8;

export async function getDashboardData(personalId: string): Promise<DashboardData> {
  const supabase = await createClient();

  const { data: alunos } = await supabase
    .from("alunos")
    .select(
      "id, nome, whatsapp, status, status_convite, pagamento_status, pagamento_vencimento, pagamento_valor, data_inicio, anamnese_ativa, bioimpedancia_ativa, bioimpedancia_frequencia_dias, ultima_atualizacao_medidas, planos(valor)"
    )
    .eq("personal_id", personalId);

  type AlunoRadar = {
    id: string;
    nome: string;
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

  const comAnamnese = alunosAtivos.filter((a) => a.anamnese_ativa).map((a) => a.id);
  const comBio = alunosAtivos.filter((a) => a.bioimpedancia_ativa && a.bioimpedancia_frequencia_dias);

  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  const seteDiasAtras = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const [
    { data: ticketsAbertos },
    { data: ciclosAtivos },
    { data: anamneses },
    { data: bioUltimas },
    { data: execHoje },
    { data: pagamentosSemana },
    aderenciaMedia,
  ] = await Promise.all([
    supabase
      .from("tickets")
      .select("id, aluno_id, created_at")
      .eq("status", "aberto")
      .in("aluno_id", idsOuVazio),
    supabase.from("ciclos").select("aluno_id, data_fim").eq("ativo", true).in("aluno_id", idsOuVazio),
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
      .from("execucoes")
      .select("aula_exercicios(aula_id)")
      .in("aluno_id", idsOuVazio)
      .gte("data", hojeInicio.toISOString()),
    supabase
      .from("pagamentos")
      .select("valor, aluno_id")
      .in("aluno_id", idsOuVazio)
      .gte("data_pagamento", seteDiasAtras),
    calcularAderenciaMedia(alunoIds),
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
  for (const t of ticketsAbertos ?? []) {
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

  // --- ciclos vencidos (o vencendo fica só na faixa da semana, 2.4) ---
  const ciclosVencendoSemana: CicloVencendoItem[] = [];
  for (const c of ciclosAtivos ?? []) {
    const status = statusCiclo(c.data_fim);
    const restantes = calcDiasRestantes(c.data_fim);
    if (status === "vencido") {
      radar.push({
        alunoId: c.aluno_id,
        alunoNome: nomePorAluno.get(c.aluno_id) ?? "Aluno",
        tipo: "ciclo_vencido",
        detalhe: `Ciclo vencido há ${Math.abs(restantes)} dia${Math.abs(restantes) === 1 ? "" : "s"}`,
        diasEmAberto: Math.abs(restantes),
        acao: { label: "Renovar", href: `/alunos/${c.aluno_id}/treino` },
      });
    } else if (status === "vencendo") {
      ciclosVencendoSemana.push({
        alunoId: c.aluno_id,
        alunoNome: nomePorAluno.get(c.aluno_id) ?? "Aluno",
        diasRestantes: restantes,
      });
    }
  }
  ciclosVencendoSemana.sort((a, b) => a.diasRestantes - b.diasRestantes);

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
        ? { label: "Chamar", href: buildWhatsappLink(a.whatsapp, `Oi ${a.nome.split(" ")[0]}! Faz um tempo que você não atualiza seus dados no Trainer Pro — tudo certo?`), externo: true }
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

  const treinosConcluidosHoje = new Set(
    ((execHoje ?? []) as unknown as { aula_exercicios: { aula_id: string } | null }[])
      .map((e) => e.aula_exercicios?.aula_id)
      .filter(Boolean)
  ).size;

  const recebidoSemana = (pagamentosSemana ?? []).reduce((s, p) => s + Number(p.valor), 0);
  const emAberto = alunosAtivos
    .filter((a) => a.pagamento_status === "atrasado")
    .reduce((s, a) => s + Number(a.pagamento_valor ?? 0), 0);

  // destaques de evolução (2.6): reaproveita o mesmo cálculo de %carga já
  // usado na Ficha do aluno/Meu progresso, só ranqueia entre todos os ativos
  const evolucoes = await Promise.all(
    alunosAtivos.map(async (a) => ({ aluno: a, resumo: await getResumoEvolucao(a.id) }))
  );
  const destaquesEvolucao: DestaqueEvolucao[] = evolucoes
    .filter((e) => e.resumo.cargaDeltaPct !== null && e.resumo.cargaDeltaPct > 0)
    .sort((a, b) => (b.resumo.cargaDeltaPct ?? 0) - (a.resumo.cargaDeltaPct ?? 0))
    .slice(0, 3)
    .map((e) => ({ alunoId: e.aluno.id, alunoNome: e.aluno.nome, cargaDeltaPct: Math.round(e.resumo.cargaDeltaPct!) }));

  // frase de abertura: template simples preenchido pelas métricas já calculadas
  // acima — sem geração de texto livre, só concatenação com base em contagem
  const qtdAtrasados = radar.filter((r) => r.tipo === "pagamento_atrasado").length;
  const qtdCiclosVencendo = ciclosVencendoSemana.length;
  const fraseAbertura = montarFraseAbertura(qtdAtrasados, qtdCiclosVencendo, radarTotal);

  return {
    fraseAbertura,
    radar: radarTopo,
    radarTotal,
    ciclosVencendoSemana,
    financeiroSemana: { recebidoSemana, emAberto },
    destaquesEvolucao,
    resumo: {
      alunosAtivos: alunosAtivos.length,
      treinosConcluidosHoje,
      aderenciaMedia: aderenciaMedia.atual,
      aderenciaTendenciaPP: aderenciaMedia.tendenciaPP,
    },
  };
}

function montarFraseAbertura(qtdAtrasados: number, qtdCiclosVencendo: number, radarTotal: number): string {
  const partes: string[] = [];
  if (qtdAtrasados > 0) partes.push(`${qtdAtrasados} aluno${qtdAtrasados === 1 ? "" : "s"} com pagamento atrasado`);
  if (qtdCiclosVencendo > 0) partes.push(`${qtdCiclosVencendo} ciclo${qtdCiclosVencendo === 1 ? "" : "s"} vencendo esta semana`);

  if (partes.length === 0) {
    return radarTotal > 0 ? "Nada urgente, mas dá uma olhada nas pendências abaixo." : "Tudo em dia por aqui. 🎉";
  }
  return `${partes.join(" e ")}.`;
}

async function calcularAderenciaMedia(alunoIds: string[]): Promise<{ atual: number; tendenciaPP: number | null }> {
  if (alunoIds.length === 0) return { atual: 0, tendenciaPP: null };
  const supabase = await createClient();
  const trintaDiasAtras = new Date(Date.now() - 30 * 86_400_000);
  const sessentaDiasAtras = new Date(Date.now() - 60 * 86_400_000);

  const { data: ciclos } = await supabase
    .from("ciclos")
    .select("id, aluno_id")
    .eq("ativo", true)
    .in("aluno_id", alunoIds);

  if (!ciclos || ciclos.length === 0) return { atual: 0, tendenciaPP: null };

  // aulas do ciclo e execuções dos últimos 60 dias não dependem uma da
  // outra — só de ciclos/alunoIds, já em mãos — então rodam em paralelo.
  // Busca 60 dias (não só 30) pra dar pra calcular a janela anterior também
  // (tendência, handoff 2.2) sem uma segunda ida ao banco.
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
      .gte("data", sessentaDiasAtras.toISOString()),
  ]);

  const aulasPorCiclo = new Map<string, number>();
  for (const a of aulas ?? []) {
    aulasPorCiclo.set(a.ciclo_id, (aulasPorCiclo.get(a.ciclo_id) ?? 0) + 1);
  }

  // sessões (aula x dia) separadas por janela — atual (últimos 30d) e
  // anterior (30-60d atrás) — não só quais aulas já foram feitas alguma vez,
  // senão o teto ficaria em ~23% independente de quanto o aluno treina.
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
    const mapa = dataExec >= trintaDiasAtras ? sessoesAtualPorAluno : sessoesAnteriorPorAluno;
    const set = mapa.get(e.aluno_id) ?? new Set<string>();
    set.add(chave);
    mapa.set(e.aluno_id, set);
  }

  const percentual = (sessoesPorAluno: Map<string, Set<string>>) => {
    const valores = ciclos.map((c) => {
      const metaSessoes = Math.max((aulasPorCiclo.get(c.id) ?? 0) * 4.3, 1);
      const feitas = sessoesPorAluno.get(c.aluno_id)?.size ?? 0;
      return Math.min(100, (feitas / metaSessoes) * 100);
    });
    return Math.round(valores.reduce((s, p) => s + p, 0) / valores.length);
  };

  const atual = percentual(sessoesAtualPorAluno);
  // só mostra tendência se havia alguma sessão na janela anterior — senão um
  // aluno que só começou há 20 dias faria a "queda" parecer maior do que é
  const houveSessaoAnterior = Array.from(sessoesAnteriorPorAluno.values()).some((s) => s.size > 0);
  const tendenciaPP = houveSessaoAnterior ? atual - percentual(sessoesAnteriorPorAluno) : null;

  return { atual, tendenciaPP };
}
