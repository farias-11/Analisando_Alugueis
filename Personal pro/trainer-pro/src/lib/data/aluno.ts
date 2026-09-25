import "server-only";
import { createClient } from "@/lib/supabase/server";
import { inicioDoDiaBrasil, inicioDaSemanaAtualBrasil } from "@/lib/status";
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
    // getUTCDay() (não getDay()) porque inicioDoDiaBrasil() já devolve meia-
    // noite de Brasília como instante UTC — usar new Date().getDay() puro
    // dava o dia da semana errado no fuso do servidor (Vercel roda em UTC),
    // trocando de dia ~3h antes da meia-noite real no Brasil.
    const hoje = inicioDoDiaBrasil().getUTCDay(); // 0=domingo..6=sábado
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
  const hojeInicio = inicioDoDiaBrasil();
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

// ---------------------------------------------------------------------------
// REGRA (não repetir o bug de 24/09): "treino/aula concluído" SEMPRE significa
// contagem de série >= série exigida em CADA exercício da aula (aquecimento +
// continuação do mesmo exercício contam como 1 item; cardio conta como feito
// com qualquer registro). NUNCA "teve pelo menos uma execução registrada" —
// isso já causou aula marcada "Concluído" com 1 série de 1 exercício feita, e
// o mesmo bug apareceu de forma independente em 3 lugares (meta semanal, card
// da aba Treino, Aderência) antes de virar essa função única. Qualquer
// indicador novo de "completou o treino" (badge, %, streak, o que for) deve
// usar getStatusExerciciosAulaDesde — ou, se o formato de dado não permitir
// (ex: view já monta um item por-exercício-com-bi-set, como em
// treino/[aulaId]/page.tsx), repetir a MESMA regra (contagem >= series) e
// deixar um comentário apontando pra cá.
// ---------------------------------------------------------------------------

/** Parte PURA da regra (sem consulta nenhuma) — recebe os exercícios da aula
 * (já ordenados) e uma contagem de séries por aula_exercicio_id já pronta, e
 * devolve o mesmo resultado de getStatusExerciciosAulaDesde. Existe separada
 * pra quem precisa checar MUITOS (aluno, aula, dia) de uma vez (ex:
 * calcularAderenciaMedia no dashboard do personal, com centenas de alunos) —
 * sem isso, cada checagem vira 2 idas ao banco, e centenas de checagens
 * viram um N+1 real (bug real já visto aqui: dashboard levando ~6s com 200
 * alunos ativos). Quem só precisa checar UM aluno/aula/período usa
 * getStatusExerciciosAulaDesde, que já busca os dados e chama esta função. */
export function calcularStatusExercicios(
  exercicios: { id: string; exercicio_id: string; series: number; tipo: string; eh_aquecimento: boolean }[],
  contagemPorAulaExercicio: Map<string, number>
) {
  const itens: { aulaExercicioId: string; concluido: boolean }[] = [];
  for (let i = 0; i < exercicios.length; i++) {
    const atual = exercicios[i];
    const anterior = exercicios[i - 1];
    if (anterior?.eh_aquecimento && anterior.exercicio_id === atual.exercicio_id) continue;
    const proximo = exercicios[i + 1];
    const temContinuacao = atual.eh_aquecimento && proximo && proximo.exercicio_id === atual.exercicio_id;
    const feitoPrincipal = (contagemPorAulaExercicio.get(atual.id) ?? 0) >= atual.series;
    const feitoContinuacao = !temContinuacao || (contagemPorAulaExercicio.get(proximo!.id) ?? 0) >= proximo!.series;
    const concluido =
      atual.tipo === "cardio"
        ? (contagemPorAulaExercicio.get(atual.id) ?? 0) > 0
        : feitoPrincipal && feitoContinuacao;
    itens.push({ aulaExercicioId: atual.id, concluido });
  }
  const algumaExecucao = exercicios.some((e) => (contagemPorAulaExercicio.get(e.id) ?? 0) > 0);
  return { itens, todosConcluidos: itens.length > 0 && itens.every((i) => i.concluido), algumaExecucao };
}

/** Status de cada exercício de uma aula num período [desde, até) — parametrizado
 * por "desde"/"até" pra dar pra checar "terminou hoje"
 * (getStatusExerciciosAulaHoje), "terminou essa semana" (getAderenciaSemana),
 * "terminou o ciclo até agora" (getResumoEvolucao/aderência) e "terminou
 * NESSE DIA especificamente" ("até" é o dia seguinte) com a MESMA regra de
 * "treino inteiro" (todo exercício com as séries batidas). Busca os dados de
 * UM aluno/aula e delega o cálculo pra calcularStatusExercicios acima —
 * quem precisa checar vários de uma vez deve buscar em lote e chamar aquela
 * função direto, não esta (ver o comentário dela). */
export async function getStatusExerciciosAulaDesde(alunoId: string, aulaId: string, desde: Date, ate?: Date) {
  const exercicios = await getExerciciosDaAula(aulaId);
  if (exercicios.length === 0) {
    return { itens: [] as { aulaExercicioId: string; concluido: boolean }[], todosConcluidos: false, algumaExecucao: false };
  }

  const supabase = await createClient();
  const ids = exercicios.map((e) => e.id);
  let query = supabase
    .from("execucoes")
    .select("aula_exercicio_id")
    .eq("aluno_id", alunoId)
    .in("aula_exercicio_id", ids)
    .gte("data", desde.toISOString());
  if (ate) query = query.lt("data", ate.toISOString());
  const { data: execs } = await query;

  const contagem = new Map<string, number>();
  for (const e of execs ?? []) contagem.set(e.aula_exercicio_id, (contagem.get(e.aula_exercicio_id) ?? 0) + 1);
  return calcularStatusExercicios(exercicios, contagem);
}

export async function getStatusExerciciosAulaHoje(alunoId: string, aulaId: string) {
  return getStatusExerciciosAulaDesde(alunoId, aulaId, inicioDoDiaBrasil());
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

/** Melhor série já registrada nesse EXERCÍCIO (maior carga, com a repetição
 * daquela MESMA série) — pra exibir como referência. Carga e repetição
 * precisam vir da mesma linha: pegar cada máximo de series diferentes
 * inventaria uma combinação que o aluno nunca fez.
 *
 * Vinculado ao exercício em si (`exercicio_id`), não ao `aula_exercicio_id`
 * (a linha específica dentro de UM ciclo/treino) — antes, quando o personal
 * trocava de ciclo e recriava o mesmo exercício numa aula nova, o máximo
 * "zerava" porque virava um aula_exercicio_id diferente, mesmo sendo o
 * mesmíssimo exercício. Isso vale tanto pra série de aquecimento quanto pra
 * série que vale — ambas apontam pro mesmo `exercicio_id`. */
export async function getUltimaMarca(
  alunoId: string,
  exercicioId: string
): Promise<{ carga: number | null; repeticoes: number | null } | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("execucoes")
    .select("carga, repeticoes, aula_exercicios!inner(exercicio_id)")
    .eq("aluno_id", alunoId)
    .eq("aula_exercicios.exercicio_id", exercicioId);

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
  const hojeInicio = inicioDoDiaBrasil();

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

  const hojeInicio = inicioDoDiaBrasil();

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
 * `aulasFeitasHojeIds` sai de graça da MESMA linha buscada aqui (a semana
 * atual já inclui hoje, e cada linha já tem `data`) — antes a Home fazia
 * mais 2 idas ao banco só pra saber "o aluno já fez o treino de hoje?"
 * (aulaConcluidaHoje, removida). Evita esse passo extra e sequencial.
 *
 * A janela é a semana CIVIL atual (domingo até agora, horário de Brasília),
 * não "últimos 7 dias" — isso era um bug real: treino feito quinta ou sexta
 * continuava marcado como "feito essa semana" na segunda seguinte, porque só
 * tinham passado poucos dias, mesmo a semana já tendo virado no domingo. */
export async function getAderenciaSemana(alunoId: string, aulas: Aula[]): Promise<{
  concluidas: number;
  meta: number;
  aulasFeitasHojeIds: Set<string>;
}> {
  if (aulas.length === 0) return { concluidas: 0, meta: 0, aulasFeitasHojeIds: new Set() };
  const supabase = await createClient();
  const inicioSemana = inicioDaSemanaAtualBrasil();
  const hojeInicio = inicioDoDiaBrasil();

  const { data } = await supabase
    .from("execucoes")
    .select("aula_exercicio_id, data, aula_exercicios(aula_id)")
    .eq("aluno_id", alunoId)
    .gte("data", inicioSemana.toISOString());

  const linhas = (data ?? []) as unknown as { data: string; aula_exercicios: { aula_id: string } | null }[];

  const aulasFeitasHojeIds = new Set(
    linhas
      .filter((l) => l.aula_exercicios?.aula_id && new Date(l.data) >= hojeInicio)
      .map((l) => l.aula_exercicios!.aula_id)
  );

  // só checa de verdade (todo exercício com as séries batidas) as aulas que
  // tiveram AO MENOS uma execução essa semana — evita rodar a checagem completa
  // pras aulas que nem foram tocadas ainda.
  const aulasTocadasIds = new Set(linhas.map((l) => l.aula_exercicios?.aula_id).filter(Boolean) as string[]);
  const aulasTocadas = aulas.filter((a) => aulasTocadasIds.has(a.id));
  const statusPorAula = await Promise.all(
    aulasTocadas.map((a) => getStatusExerciciosAulaDesde(alunoId, a.id, inicioSemana))
  );
  const concluidas = statusPorAula.filter((s) => s.todosConcluidos).length;

  return { concluidas, meta: aulas.length, aulasFeitasHojeIds };
}
