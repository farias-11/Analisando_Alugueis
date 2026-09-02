import "server-only";
import { createClient } from "@/lib/supabase/server";
import { statusCiclo, diasDesde } from "@/lib/status";
import type { Aluno, StatusCiclo } from "@/lib/types";

export interface AlunoComTreino extends Aluno {
  statusTreino: StatusCiclo | null;
}

export async function listarAlunos(
  personalId: string,
  filtros?: {
    q?: string;
    pagamento?: string;
    treino?: string;
    status?: string;
    avaliacao?: string;
    semCheckin?: string;
    ordenar?: string;
  }
): Promise<AlunoComTreino[]> {
  const supabase = await createClient();

  let query = supabase.from("alunos").select("*").eq("personal_id", personalId);
  if (filtros?.q) query = query.ilike("nome", `%${filtros.q}%`);
  if (filtros?.pagamento) query = query.eq("pagamento_status", filtros.pagamento);
  if (filtros?.status) query = query.eq("status", filtros.status);

  const { data: alunos } = await query.order("nome", { ascending: true });
  const lista = (alunos as Aluno[]) ?? [];

  const { data: ciclos } = await supabase
    .from("ciclos")
    .select("aluno_id, data_fim")
    .eq("ativo", true)
    .in("aluno_id", lista.length ? lista.map((a) => a.id) : ["00000000-0000-0000-0000-000000000000"]);

  const fimPorAluno = new Map((ciclos ?? []).map((c) => [c.aluno_id, c.data_fim]));

  let comTreino: AlunoComTreino[] = lista.map((a) => {
    const dataFim = fimPorAluno.get(a.id);
    return { ...a, statusTreino: dataFim ? statusCiclo(dataFim) : null };
  });

  if (filtros?.treino) {
    comTreino = comTreino.filter((a) => a.statusTreino === filtros.treino);
  }
  if (filtros?.semCheckin === "30") {
    comTreino = comTreino.filter((a) => {
      const dias = diasDesde(a.ultima_atualizacao_medidas);
      return dias === null || dias >= 30;
    });
  }
  if (filtros?.avaliacao === "pendente") {
    const pendentes = await alunosComAvaliacaoPendente(comTreino);
    comTreino = comTreino.filter((a) => pendentes.has(a.id));
  }

  if (filtros?.ordenar === "urgencia") {
    comTreino = comTreino.slice().sort((a, b) => pontuarUrgencia(b) - pontuarUrgencia(a));
  }

  return comTreino;
}

// Pontuação simples pra ordenar a lista por urgência (handoff, seção 4):
// atraso de pagamento pesa mais que treino vencido, que pesa mais que sem
// check-in — dentro de cada aluno os pesos só se somam, não competem entre
// si. Mesma ideia (não a mesma função) do radar de prioridades do dashboard,
// que também cruza tickets — aqui fica só com o que a listagem já carrega,
// pra não pagar o custo de mais uma consulta só pra ordenar.
function pontuarUrgencia(a: AlunoComTreino): number {
  let pontos = 0;
  if (a.pagamento_status === "atrasado") pontos += 30;
  if (a.statusTreino === "vencido") pontos += 20;
  else if (a.statusTreino === "vencendo") pontos += 10;
  const diasSemCheckin = diasDesde(a.ultima_atualizacao_medidas);
  if (diasSemCheckin === null) pontos += 5;
  else pontos += Math.min(diasSemCheckin, 60) / 4;
  return pontos;
}

/** Mesma lógica usada no dashboard: anamnese ativa sem resposta, ou
 * bioimpedância ativa vencida — reaproveitada aqui pro filtro "Avaliações". */
async function alunosComAvaliacaoPendente(alunos: Aluno[]): Promise<Set<string>> {
  const supabase = await createClient();
  const pendentes = new Set<string>();

  const comAnamnese = alunos.filter((a) => a.anamnese_ativa).map((a) => a.id);
  if (comAnamnese.length) {
    const { data: anamneses } = await supabase
      .from("anamneses")
      .select("aluno_id, concluida")
      .in("aluno_id", comAnamnese);
    const concluidas = new Set((anamneses ?? []).filter((a) => a.concluida).map((a) => a.aluno_id));
    for (const id of comAnamnese) if (!concluidas.has(id)) pendentes.add(id);
  }

  const comBio = alunos.filter((a) => a.bioimpedancia_ativa && a.bioimpedancia_frequencia_dias);
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
        pendentes.add(a.id);
      }
    }
  }

  return pendentes;
}
