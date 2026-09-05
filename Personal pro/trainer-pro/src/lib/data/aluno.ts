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

export interface SugestaoRenovacao {
  aulaExercicioId: string;
  aulaNome: string;
  exercicioNome: string;
  cargaAtual: number | null;
  cargaSugerida: number | null;
  subiu: boolean;
}

/** Renovação com progressão sugerida (handoff 3.2), regra MVP: se a última
 * execução registrada ficou acima da carga_inicial do exercício, sugere +5%
 * (arredondado ao 0.5kg mais próximo); senão mantém a carga atual. Não tenta
 * detectar estagnação prolongada ou risco de sobrecarga — fica pro v2. */
export async function getSugestoesRenovacao(cicloId: string): Promise<SugestaoRenovacao[]> {
  const supabase = await createClient();

  const { data: aulas } = await supabase.from("aulas").select("id, nome").eq("ciclo_id", cicloId);
  const aulaIds = (aulas ?? []).map((a) => a.id);
  if (!aulaIds.length) return [];
  const nomeAula = new Map((aulas ?? []).map((a) => [a.id, a.nome]));

  const { data: aulaExercicios } = await supabase
    .from("aula_exercicios")
    .select("id, aula_id, carga_inicial, exercicios(nome)")
    .in("aula_id", aulaIds)
    .eq("tipo", "forca")
    .not("carga_inicial", "is", null);

  const aeIds = (aulaExercicios ?? []).map((ae) => ae.id);
  const { data: execs } = aeIds.length
    ? await supabase
        .from("execucoes")
        .select("aula_exercicio_id, carga, data")
        .in("aula_exercicio_id", aeIds)
        .not("carga", "is", null)
        .order("data", { ascending: false })
    : { data: [] as { aula_exercicio_id: string; carga: number; data: string }[] };

  const ultimaCargaPorAulaExercicio = new Map<string, number>();
  for (const e of execs ?? []) {
    if (!ultimaCargaPorAulaExercicio.has(e.aula_exercicio_id)) {
      ultimaCargaPorAulaExercicio.set(e.aula_exercicio_id, Number(e.carga));
    }
  }

  return ((aulaExercicios ?? []) as unknown as { id: string; aula_id: string; carga_inicial: number | null; exercicios: { nome: string } | null }[]).map(
    (ae) => {
      const cargaAtual = ae.carga_inicial !== null ? Number(ae.carga_inicial) : null;
      const ultimaCarga = ultimaCargaPorAulaExercicio.get(ae.id) ?? null;
      const subiu = cargaAtual !== null && ultimaCarga !== null && ultimaCarga > cargaAtual;
      const cargaSugerida = subiu && cargaAtual !== null ? Math.round(cargaAtual * 1.05 * 2) / 2 : cargaAtual;
      return {
        aulaExercicioId: ae.id,
        aulaNome: nomeAula.get(ae.aula_id) ?? "",
        exercicioNome: ae.exercicios?.nome ?? "Exercício",
        cargaAtual,
        cargaSugerida,
        subiu,
      };
    }
  );
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

  // se já treinou hoje mas AINDA NÃO terminou esse treino, a "aula do dia"
  // continua sendo a que ele começou — senão, ao sair no meio e voltar, a
  // home já pularia pro próximo em vez de deixar ele continuar de onde parou.
  // Só avança pra próxima da sequência (mesmo no mesmo dia) quando o treino
  // de hoje está DE VERDADE 100% concluído — senão ficava reoferecendo um
  // treino que o aluno já tinha acabado de terminar.
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  const feitaHoje = linhas.find((l) => new Date(l.data) >= hojeInicio);
  if (feitaHoje) {
    const aulaHojeId = feitaHoje.aula_exercicios!.aula_id;
    const { todosConcluidos } = await getStatusExerciciosAulaHoje(alunoId, aulaHojeId);
    if (!todosConcluidos) return idParaAula.get(aulaHojeId) ?? aulasOrdenadas[0];

    const indiceHoje = aulasOrdenadas.findIndex((a) => a.id === aulaHojeId);
    if (indiceHoje === -1) return aulasOrdenadas[0];
    return aulasOrdenadas[(indiceHoje + 1) % aulasOrdenadas.length];
  }

  const ultimaAulaId = linhas[0].aula_exercicios!.aula_id;
  const indiceAtual = aulasOrdenadas.findIndex((a) => a.id === ultimaAulaId);
  if (indiceAtual === -1) return aulasOrdenadas[0];

  return aulasOrdenadas[(indiceAtual + 1) % aulasOrdenadas.length];
}

/** Status de cada exercício da aula hoje (aquecimento + continuação do mesmo
 * exercício contam como um item só; cardio conta como feito com qualquer
 * registro hoje) — mesma regra usada na lista de exercícios da aula, mas
 * compartilhada aqui pra também dar pra saber se o treino INTEIRO já terminou
 * de verdade (não só o último exercício que o aluno abriu). */
export async function getStatusExerciciosAulaHoje(alunoId: string, aulaId: string) {
  const exercicios = await getExerciciosDaAula(aulaId);
  if (exercicios.length === 0) return { itens: [] as { aulaExercicioId: string; concluido: boolean }[], todosConcluidos: false };

  const supabase = await createClient();
  const ids = exercicios.map((e) => e.id);
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);
  const { data: execs } = await supabase
    .from("execucoes")
    .select("aula_exercicio_id")
    .eq("aluno_id", alunoId)
    .in("aula_exercicio_id", ids)
    .gte("data", hojeInicio.toISOString());

  const contagem = new Map<string, number>();
  for (const e of execs ?? []) contagem.set(e.aula_exercicio_id, (contagem.get(e.aula_exercicio_id) ?? 0) + 1);

  const itens: { aulaExercicioId: string; concluido: boolean }[] = [];
  for (let i = 0; i < exercicios.length; i++) {
    const atual = exercicios[i];
    const anterior = exercicios[i - 1];
    if (anterior?.eh_aquecimento && anterior.exercicio_id === atual.exercicio_id) continue;
    const proximo = exercicios[i + 1];
    const temContinuacao = atual.eh_aquecimento && proximo && proximo.exercicio_id === atual.exercicio_id;
    const feitoPrincipal = (contagem.get(atual.id) ?? 0) >= atual.series;
    const feitoContinuacao = !temContinuacao || (contagem.get(proximo!.id) ?? 0) >= proximo!.series;
    const concluido = atual.tipo === "cardio" ? (contagem.get(atual.id) ?? 0) > 0 : feitoPrincipal && feitoContinuacao;
    itens.push({ aulaExercicioId: atual.id, concluido });
  }
  return { itens, todosConcluidos: itens.length > 0 && itens.every((i) => i.concluido) };
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

/** Melhor série já registrada nesse exercício (maior carga, com a repetição
 * daquela MESMA série) — pra exibir como referência. Carga e repetição
 * precisam vir da mesma linha: pegar cada máximo de series diferentes
 * inventaria uma combinação que o aluno nunca fez. */
export async function getUltimaMarca(
  alunoId: string,
  aulaExercicioId: string
): Promise<{ carga: number | null; repeticoes: number | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("execucoes")
    .select("carga, repeticoes")
    .eq("aluno_id", alunoId)
    .eq("aula_exercicio_id", aulaExercicioId);

  if (!data || data.length === 0) return null;

  // A marca tem que vir de UMA série que realmente aconteceu — pegar a maior
  // carga e a maior repetição de séries DIFERENTES (como era antes) inventa
  // uma combinação que o aluno nunca fez (ex: "15kg x 15 reps" quando na
  // verdade fez 15kg x 10 reps numa série e 8kg x 15 reps em outra), fazendo
  // parecer que o app registrou errado o que ele fez.
  let melhor: { carga: number | null; repeticoes: number | null } | null = null;
  for (const row of data) {
    if (row.carga === null) continue;
    if (!melhor || melhor.carga === null || row.carga > melhor.carga) melhor = row;
  }
  if (melhor) return melhor;

  // nenhuma série com carga registrada (ex: exercício sem peso) — melhor
  // esforço vira só a maior repetição
  let maiorRepeticoes: number | null = null;
  for (const row of data) {
    if (row.repeticoes !== null && (maiorRepeticoes === null || row.repeticoes > maiorRepeticoes)) {
      maiorRepeticoes = row.repeticoes;
    }
  }
  return { carga: null, repeticoes: maiorRepeticoes };
}

/** Séries já registradas hoje para esse exercício — usado pra restaurar o
 * progresso da execução se o aluno sair do app no meio do treino e voltar. */
export async function getExecucoesDeHoje(
  alunoId: string,
  aulaExercicioId: string
): Promise<Record<number, { carga: number | null; repeticoes: number | null }>> {
  const supabase = await createClient();
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("execucoes")
    .select("serie_numero, carga, repeticoes")
    .eq("aluno_id", alunoId)
    .eq("aula_exercicio_id", aulaExercicioId)
    .gte("data", hojeInicio.toISOString());

  const porSerie: Record<number, { carga: number | null; repeticoes: number | null }> = {};
  for (const row of data ?? []) {
    porSerie[row.serie_numero] = { carga: row.carga, repeticoes: row.repeticoes };
  }
  return porSerie;
}

/** Início do treino de hoje pra essa aula (primeira série registrada hoje em
 * qualquer exercício dela) — usado pro cronômetro ao vivo na execução, pra ele
 * continuar contando certo mesmo se o aluno sair e voltar no meio do treino.
 * Recebe os ids de aula_exercicios já calculados pela página (em vez de
 * buscar de novo aqui) — a página que chama isso já tem essa lista pronta. */
export async function getInicioTreinoHoje(alunoId: string, aulaExercicioIds: string[]): Promise<string | null> {
  if (aulaExercicioIds.length === 0) return null;
  const supabase = await createClient();

  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("execucoes")
    .select("data")
    .eq("aluno_id", alunoId)
    .in("aula_exercicio_id", aulaExercicioIds)
    .gte("data", hojeInicio.toISOString())
    .order("data", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.data ?? null;
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

/** Recebe as aulas do ciclo ativo já buscadas pelo chamador (evita repetir
 * a mesma consulta de ciclo+aulas que a página já fez em paralelo).
 *
 * `aulasFeitasHojeIds` sai de graça da MESMA linha buscada aqui (a janela de
 * 7 dias já inclui hoje, e cada linha já tem `data`) — antes a Home fazia
 * mais 2 idas ao banco só pra saber "o aluno já fez o treino de hoje?"
 * (aulaConcluidaHoje, removida). Evita esse passo extra e sequencial. */
export async function getAderenciaSemana(alunoId: string, aulas: Aula[]): Promise<{
  concluidas: number;
  meta: number;
  aulasFeitasHojeIds: Set<string>;
}> {
  if (aulas.length === 0) return { concluidas: 0, meta: 0, aulasFeitasHojeIds: new Set() };
  const supabase = await createClient();
  const seteDiasAtras = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("execucoes")
    .select("aula_exercicio_id, data, aula_exercicios(aula_id)")
    .eq("aluno_id", alunoId)
    .gte("data", seteDiasAtras);

  const linhas = (data ?? []) as unknown as { data: string; aula_exercicios: { aula_id: string } | null }[];

  const aulasConcluidas = new Set(linhas.map((e) => e.aula_exercicios?.aula_id).filter(Boolean));
  const aulasFeitasHojeIds = new Set(
    linhas
      .filter((l) => l.aula_exercicios?.aula_id && new Date(l.data) >= hojeInicio)
      .map((l) => l.aula_exercicios!.aula_id)
  );

  return { concluidas: aulasConcluidas.size, meta: aulas.length, aulasFeitasHojeIds };
}
