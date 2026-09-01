import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Aula, AulaExercicio, Ciclo, Exercicio, Execucao } from "@/lib/types";

export async function getCicloAtivo(alunoId: string): Promise<Ciclo | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ciclos")
    .select("*")
    .eq("aluno_id", alunoId)
    .eq("ativo", true)
    .maybeSingle();
  return (data as Ciclo) ?? null;
}

export async function getAulasDoCiclo(cicloId: string): Promise<Aula[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("aulas")
    .select("*")
    .eq("ciclo_id", cicloId)
    .order("ordem", { ascending: true });
  return (data as Aula[]) ?? [];
}

/** "Aula do dia": se o personal vinculou dias da semana a alguma aula do ciclo,
 * usa isso (e pode não haver aula hoje — dia de descanso).
 *
 * Sem nenhum dia definido, a "próxima aula" segue o progresso real do aluno,
 * não o calendário: acha a última aula com execução registrada e aponta pra
 * seguinte na sequência (voltando ao início no fim do ciclo). Assim, se o
 * aluno treinar num dia diferente do "esperado", o app continua sabendo qual
 * é realmente o próximo treino, em vez de repetir ou pular aulas por causa
 * de uma rotação presa ao dia do ano.
 */
export async function aulaDoDia(alunoId: string, aulas: Aula[]): Promise<Aula | null> {
  if (aulas.length === 0) return null;

  const usaDiasFixos = aulas.some((a) => a.dias_semana && a.dias_semana.length > 0);
  if (usaDiasFixos) {
    const hoje = new Date().getDay(); // 0=domingo..6=sábado
    return aulas.find((a) => a.dias_semana?.includes(hoje)) ?? null;
  }

  const aulasOrdenadas = [...aulas].sort((a, b) => a.ordem - b.ordem);
  const aulaIds = new Set(aulasOrdenadas.map((a) => a.id));
  const idParaAula = new Map(aulasOrdenadas.map((a) => [a.id, a]));

  const supabase = await createClient();
  const { data: execucoesRecentes } = await supabase
    .from("execucoes")
    .select("data, aula_exercicios(aula_id)")
    .eq("aluno_id", alunoId)
    .order("data", { ascending: false })
    .limit(100);

  type Linha = { data: string; aula_exercicios: { aula_id: string } | null };
  const linhas = ((execucoesRecentes ?? []) as unknown as Linha[]).filter(
    (l) => l.aula_exercicios?.aula_id && aulaIds.has(l.aula_exercicios.aula_id)
  );

  if (linhas.length === 0) return aulasOrdenadas[0]; // nunca treinou nesse ciclo -> primeira aula

  // se já treinou hoje, a "aula do dia" continua sendo a que ele fez hoje —
  // só avança pra próxima da sequência quando o dia realmente virar (senão,
  // ao terminar um treino, a home já pularia pro próximo em vez de mostrar
  // "concluído" pro que acabou de ser feito)
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  const feitaHoje = linhas.find((l) => new Date(l.data) >= hojeInicio);
  if (feitaHoje) {
    return idParaAula.get(feitaHoje.aula_exercicios!.aula_id) ?? aulasOrdenadas[0];
  }

  const ultimaAulaId = linhas[0].aula_exercicios!.aula_id;
  const indiceAtual = aulasOrdenadas.findIndex((a) => a.id === ultimaAulaId);
  if (indiceAtual === -1) return aulasOrdenadas[0];

  return aulasOrdenadas[(indiceAtual + 1) % aulasOrdenadas.length];
}

/** Se o aluno já registrou pelo menos uma série de qualquer exercício dessa
 * aula hoje — usado pra não ficar convidando a repetir um treino já feito. */
export async function aulaConcluidaHoje(alunoId: string, aulaId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: exs } = await supabase.from("aula_exercicios").select("id").eq("aula_id", aulaId);
  const ids = (exs ?? []).map((e) => e.id);
  if (ids.length === 0) return false;

  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("execucoes")
    .select("id", { count: "exact", head: true })
    .eq("aluno_id", alunoId)
    .in("aula_exercicio_id", ids)
    .gte("data", hojeInicio.toISOString());

  return (count ?? 0) > 0;
}

export async function getExerciciosDaAula(
  aulaId: string
): Promise<(AulaExercicio & { exercicio: Exercicio })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("aula_exercicios")
    .select("*, exercicio:exercicios(*)")
    .eq("aula_id", aulaId)
    .order("ordem", { ascending: true });
  return (data as (AulaExercicio & { exercicio: Exercicio })[]) ?? [];
}

export async function getAulaExercicio(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("aula_exercicios")
    .select("*, exercicio:exercicios(*, midias:exercicio_midias(*)), aula:aulas(*)")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Maior carga e maior repetição já registradas nesse exercício, pra exibir como referência. */
export async function getUltimaMarca(
  alunoId: string,
  aulaExercicioId: string
): Promise<{ carga: number | null; repeticoes: number | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("execucoes")
    .select("carga, repeticoes")
    .eq("aluno_id", alunoId)
    .eq("aula_exercicio_id", aulaExercicioId)
    .order("carga", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const { data: maxRep } = await supabase
    .from("execucoes")
    .select("repeticoes")
    .eq("aluno_id", alunoId)
    .eq("aula_exercicio_id", aulaExercicioId)
    .order("repeticoes", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { carga: data.carga, repeticoes: maxRep?.repeticoes ?? data.repeticoes };
}

export async function getExecucoesRecentes(
  alunoId: string,
  aulaExercicioId: string
): Promise<Execucao[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("execucoes")
    .select("*")
    .eq("aluno_id", alunoId)
    .eq("aula_exercicio_id", aulaExercicioId)
    .order("data", { ascending: false })
    .limit(20);
  return (data as Execucao[]) ?? [];
}

export async function getAderenciaSemana(alunoId: string): Promise<{
  concluidas: number;
  meta: number;
}> {
  const supabase = await createClient();
  const seteDiasAtras = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const ciclo = await getCicloAtivo(alunoId);
  if (!ciclo) return { concluidas: 0, meta: 0 };

  const aulas = await getAulasDoCiclo(ciclo.id);

  const { data } = await supabase
    .from("execucoes")
    .select("aula_exercicio_id, data, aula_exercicios(aula_id)")
    .eq("aluno_id", alunoId)
    .gte("data", seteDiasAtras);

  const aulasConcluidas = new Set(
    ((data ?? []) as unknown as { aula_exercicios: { aula_id: string } | null }[])
      .map((e) => e.aula_exercicios?.aula_id)
      .filter(Boolean)
  );

  return { concluidas: aulasConcluidas.size, meta: aulas.length };
}
