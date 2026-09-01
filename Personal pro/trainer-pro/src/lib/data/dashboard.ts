import "server-only";
import { createClient } from "@/lib/supabase/server";
import { statusCiclo, diasDesde } from "@/lib/status";

export interface AtencaoItem {
  label: string;
  count: number;
  href: string;
  tone: "danger" | "warning";
}

export interface DashboardData {
  atencao: AtencaoItem[];
  resumo: {
    alunosAtivos: number;
    treinosConcluidosHoje: number;
    aderenciaMedia: number;
  };
}

export async function getDashboardData(personalId: string): Promise<DashboardData> {
  const supabase = await createClient();

  const { data: alunos } = await supabase
    .from("alunos")
    .select(
      "id, status, pagamento_status, anamnese_ativa, bioimpedancia_ativa, bioimpedancia_frequencia_dias"
    )
    .eq("personal_id", personalId);

  const todosAlunos = alunos ?? [];
  const alunosAtivos = todosAlunos.filter((a) => a.status === "ativo");
  const alunoIds = alunosAtivos.map((a) => a.id);

  const pagamentosAtrasados = alunosAtivos.filter((a) => a.pagamento_status === "atrasado").length;

  const { count: ticketsAbertos } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("status", "aberto")
    .in("aluno_id", alunoIds.length ? alunoIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: ciclosAtivos } = await supabase
    .from("ciclos")
    .select("aluno_id, data_fim")
    .eq("ativo", true)
    .in("aluno_id", alunoIds.length ? alunoIds : ["00000000-0000-0000-0000-000000000000"]);

  const treinosVencidos = (ciclosAtivos ?? []).filter(
    (c) => statusCiclo(c.data_fim) === "vencido"
  ).length;

  // avaliações pendentes: anamnese não concluída (quando ativa) + bioimpedância vencida (quando ativa)
  let avaliacoesPendentes = 0;
  const comAnamnese = alunosAtivos.filter((a) => a.anamnese_ativa).map((a) => a.id);
  if (comAnamnese.length) {
    const { data: anamneses } = await supabase
      .from("anamneses")
      .select("aluno_id, concluida")
      .in("aluno_id", comAnamnese);
    const concluidas = new Set((anamneses ?? []).filter((a) => a.concluida).map((a) => a.aluno_id));
    avaliacoesPendentes += comAnamnese.filter((id) => !concluidas.has(id)).length;
  }

  const comBio = alunosAtivos.filter((a) => a.bioimpedancia_ativa && a.bioimpedancia_frequencia_dias);
  if (comBio.length) {
    const { data: ultimas } = await supabase
      .from("bioimpedancias")
      .select("aluno_id, data")
      .in(
        "aluno_id",
        comBio.map((a) => a.id)
      )
      .order("data", { ascending: false });

    const ultimaPorAluno = new Map<string, string>();
    for (const b of ultimas ?? []) {
      if (!ultimaPorAluno.has(b.aluno_id)) ultimaPorAluno.set(b.aluno_id, b.data);
    }
    for (const a of comBio) {
      const ultima = ultimaPorAluno.get(a.id);
      const dias = ultima ? diasDesde(ultima) : null;
      if (dias === null || (a.bioimpedancia_frequencia_dias && dias >= a.bioimpedancia_frequencia_dias)) {
        avaliacoesPendentes += 1;
      }
    }
  }

  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  const { data: execHoje } = await supabase
    .from("execucoes")
    .select("aula_exercicios(aula_id)")
    .in("aluno_id", alunoIds.length ? alunoIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("data", hojeInicio.toISOString());

  const treinosConcluidosHoje = new Set(
    ((execHoje ?? []) as unknown as { aula_exercicios: { aula_id: string } | null }[])
      .map((e) => e.aula_exercicios?.aula_id)
      .filter(Boolean)
  ).size;

  const atencao: AtencaoItem[] = (
    [
      { label: "Pagamentos atrasados", count: pagamentosAtrasados, href: "/financeiro", tone: "danger" },
      { label: "Tickets de dor abertos", count: ticketsAbertos ?? 0, href: "/tickets", tone: "danger" },
      { label: "Treinos vencidos", count: treinosVencidos, href: "/alunos?treino=vencido", tone: "warning" },
      { label: "Avaliações pendentes", count: avaliacoesPendentes, href: "/alunos?avaliacao=pendente", tone: "warning" },
    ] as const satisfies readonly AtencaoItem[]
  ).filter((i) => i.count > 0);

  const aderenciaMedia = await calcularAderenciaMedia(alunoIds);

  return {
    atencao,
    resumo: {
      alunosAtivos: alunosAtivos.length,
      treinosConcluidosHoje,
      aderenciaMedia,
    },
  };
}

async function calcularAderenciaMedia(alunoIds: string[]): Promise<number> {
  if (alunoIds.length === 0) return 0;
  const supabase = await createClient();
  const trintaDiasAtras = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const { data: ciclos } = await supabase
    .from("ciclos")
    .select("id, aluno_id")
    .eq("ativo", true)
    .in("aluno_id", alunoIds);

  if (!ciclos || ciclos.length === 0) return 0;

  const { data: aulas } = await supabase
    .from("aulas")
    .select("id, ciclo_id")
    .in(
      "ciclo_id",
      ciclos.map((c) => c.id)
    );

  const aulasPorCiclo = new Map<string, number>();
  for (const a of aulas ?? []) {
    aulasPorCiclo.set(a.ciclo_id, (aulasPorCiclo.get(a.ciclo_id) ?? 0) + 1);
  }

  const { data: execs } = await supabase
    .from("execucoes")
    .select("aluno_id, data, aula_exercicios(aula_id)")
    .in("aluno_id", alunoIds)
    .gte("data", trintaDiasAtras);

  // sessões (aula x dia), não só quais aulas já foram feitas alguma vez —
  // senão o teto fica em ~23% independente de quanto o aluno treina.
  const sessoesPorAluno = new Map<string, Set<string>>();
  for (const e of (execs ?? []) as unknown as {
    aluno_id: string;
    data: string;
    aula_exercicios: { aula_id: string } | null;
  }[]) {
    const aulaId = e.aula_exercicios?.aula_id;
    if (!aulaId) continue;
    const set = sessoesPorAluno.get(e.aluno_id) ?? new Set<string>();
    set.add(`${aulaId}_${e.data.slice(0, 10)}`);
    sessoesPorAluno.set(e.aluno_id, set);
  }

  const percentuais = ciclos.map((c) => {
    const metaSessoes = Math.max((aulasPorCiclo.get(c.id) ?? 0) * 4.3, 1);
    const feitas = sessoesPorAluno.get(c.aluno_id)?.size ?? 0;
    return Math.min(100, (feitas / metaSessoes) * 100);
  });

  return Math.round(percentuais.reduce((s, p) => s + p, 0) / percentuais.length);
}
