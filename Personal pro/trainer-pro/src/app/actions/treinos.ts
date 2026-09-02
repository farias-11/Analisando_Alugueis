"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePersonal } from "@/lib/data/current-user";
import { camposExercicioAula } from "@/lib/campos-exercicio-aula";
import { revalidatePath } from "next/cache";

async function assertDono(alunoId: string) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const { data: aluno } = await supabase
    .from("alunos")
    .select("id, ciclo_duracao_padrao_semanas")
    .eq("id", alunoId)
    .eq("personal_id", personal.id)
    .maybeSingle();
  if (!aluno) throw new Error("Aluno não encontrado.");
  return { supabase, aluno };
}

// assertDono só garante que alunoId pertence ao personal logado — sem essas
// checagens, um cicloId/aulaId/aulaExercicioId de OUTRO aluno do mesmo
// personal (por bug de UI, corrida de digitação, ou um form adulterado no
// devtools) era aceito sem erro e a mutação ia parar no treino errado.
type SupaClient = Awaited<ReturnType<typeof createClient>>;

async function assertCicloDoAluno(supabase: SupaClient, alunoId: string, cicloId: string) {
  const { data } = await supabase.from("ciclos").select("id").eq("id", cicloId).eq("aluno_id", alunoId).maybeSingle();
  if (!data) throw new Error("Ciclo não encontrado para este aluno.");
}

async function assertAulaDoAluno(supabase: SupaClient, alunoId: string, aulaId: string) {
  const { data } = await supabase.from("aulas").select("id, ciclos(aluno_id)").eq("id", aulaId).maybeSingle();
  const donoId = (data as unknown as { ciclos: { aluno_id: string } | null } | null)?.ciclos?.aluno_id;
  if (donoId !== alunoId) throw new Error("Aula não encontrada para este aluno.");
}

async function assertAulaExercicioDoAluno(supabase: SupaClient, alunoId: string, aulaExercicioId: string) {
  const { data } = await supabase
    .from("aula_exercicios")
    .select("id, aulas(ciclos(aluno_id))")
    .eq("id", aulaExercicioId)
    .maybeSingle();
  const donoId = (data as unknown as { aulas: { ciclos: { aluno_id: string } | null } | null } | null)?.aulas?.ciclos
    ?.aluno_id;
  if (donoId !== alunoId) throw new Error("Exercício não encontrado para este aluno.");
}

export async function criarCiclo(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const { supabase, aluno } = await assertDono(alunoId);

  const { data: ciclo } = await supabase
    .from("ciclos")
    .insert({
      aluno_id: alunoId,
      duracao_semanas: aluno.ciclo_duracao_padrao_semanas,
    })
    .select()
    .single();

  if (ciclo) {
    await supabase.from("aulas").insert({ ciclo_id: ciclo.id, nome: "Aula 1", ordem: 0 });
  }

  revalidatePath(`/alunos/${alunoId}`);
  revalidatePath(`/alunos/${alunoId}/treino`);
}

// Encerra o ciclo atual (vencido ou vencendo) e começa um novo hoje, copiando
// a mesma estrutura de aulas/exercícios como ponto de partida — o personal
// edita o que precisar depois. Sem isso não havia como sair de um ciclo
// vencido: o editor só oferecia "criar ciclo" quando não existia nenhum ativo.
//
// Extraído em função própria pra ser reaproveitado pela renovação em lote
// (renovarCiclosEmLote) e, mais adiante, pela renovação com progressão
// sugerida — ambas fazem a mesma cópia de estrutura, só mudam quem chama.
async function executarRenovacaoCiclo(
  supabase: SupaClient,
  alunoId: string,
  cicloAntigoId: string,
  duracaoSemanas: number,
  ajusteCarga?: (cargaAtual: number | null, aulaExercicioId: string) => number | null
) {
  await supabase.from("ciclos").update({ ativo: false }).eq("id", cicloAntigoId);

  const { data: novoCiclo } = await supabase
    .from("ciclos")
    .insert({ aluno_id: alunoId, duracao_semanas: duracaoSemanas })
    .select()
    .single();

  if (novoCiclo) {
    const { data: aulasAntigas } = await supabase
      .from("aulas")
      .select("*, aula_exercicios(*)")
      .eq("ciclo_id", cicloAntigoId)
      .order("ordem");

    // cada aula (e seus exercícios) é independente das outras — roda em
    // paralelo em vez de uma esperar a outra terminar
    await Promise.all(
      (aulasAntigas ?? []).map(async (aula) => {
        const { data: novaAula } = await supabase
          .from("aulas")
          .insert({
            ciclo_id: novoCiclo.id,
            nome: aula.nome,
            ordem: aula.ordem,
            duracao_estimada_min: aula.duracao_estimada_min,
            dias_semana: aula.dias_semana,
          })
          .select()
          .single();
        if (!novaAula) return;

        const exs = (aula.aula_exercicios ?? []) as {
          id: string;
          exercicio_id: string;
          ordem: number;
          series: number;
          repeticoes: string;
          carga_inicial: number | null;
          descanso_seg: number | null;
          eh_aquecimento: boolean;
          combina_proximo: boolean;
          tipo: "forca" | "cardio";
          duracao_min: number | null;
          intensidade: string | null;
        }[];
        if (exs.length) {
          await supabase.from("aula_exercicios").insert(
            exs.map((ex) => ({
              aula_id: novaAula.id,
              exercicio_id: ex.exercicio_id,
              ordem: ex.ordem,
              series: ex.series,
              repeticoes: ex.repeticoes,
              carga_inicial: ajusteCarga ? ajusteCarga(ex.carga_inicial, ex.id) : ex.carga_inicial,
              descanso_seg: ex.descanso_seg,
              eh_aquecimento: ex.eh_aquecimento,
              combina_proximo: ex.combina_proximo,
              tipo: ex.tipo,
              duracao_min: ex.duracao_min,
              intensidade: ex.intensidade,
            }))
          );
        }
      })
    );
  }
}

// Renovação com progressão sugerida (handoff 3.2): mesma renovação de
// sempre, mas o personal revisa/ajusta a carga sugerida (+5% nos exercícios
// que subiram, mantém nos estagnados — MVP, sem lidar com risco de
// sobrecarga/estagnação ainda, isso fica pro v2) antes de aplicar. "ajustes"
// chega como JSON { [aulaExercicioId]: novaCarga }, montado no modal client.
export async function renovarCicloComProgressao(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const cicloAntigoId = String(formData.get("cicloId") || "");
  const ajustes = JSON.parse(String(formData.get("ajustes") || "{}")) as Record<string, number>;
  const { supabase, aluno } = await assertDono(alunoId);
  await assertCicloDoAluno(supabase, alunoId, cicloAntigoId);

  await executarRenovacaoCiclo(supabase, alunoId, cicloAntigoId, aluno.ciclo_duracao_padrao_semanas, (cargaAtual, aulaExercicioId) =>
    ajustes[aulaExercicioId] !== undefined ? ajustes[aulaExercicioId] : cargaAtual
  );

  revalidatePath(`/alunos/${alunoId}`);
  revalidatePath(`/alunos/${alunoId}/treino`);
}

// Ações em lote (3.1 do handoff): renova de uma vez todos os ciclos ativos
// dos alunos selecionados — cada um usa sua própria duração padrão. Alunos
// sem ciclo ativo são ignorados silenciosamente (nada pra renovar).
export async function renovarCiclosEmLote(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const alunoIds = formData.getAll("alunoIds").map(String);
  if (!alunoIds.length) return;

  const { data: alunos } = await supabase
    .from("alunos")
    .select("id, ciclo_duracao_padrao_semanas")
    .in("id", alunoIds)
    .eq("personal_id", personal.id);

  await Promise.all(
    (alunos ?? []).map(async (aluno) => {
      const { data: cicloAtivo } = await supabase
        .from("ciclos")
        .select("id")
        .eq("aluno_id", aluno.id)
        .eq("ativo", true)
        .maybeSingle();
      if (!cicloAtivo) return;
      await executarRenovacaoCiclo(supabase, aluno.id, cicloAtivo.id, aluno.ciclo_duracao_padrao_semanas);
    })
  );

  revalidatePath("/alunos");
  revalidatePath("/dashboard");
}

export async function atualizarDiasSemanaAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const aulaId = String(formData.get("aulaId") || "");
  const dias = formData.getAll("dias").map(Number);
  const { supabase } = await assertDono(alunoId);
  await assertAulaDoAluno(supabase, alunoId, aulaId);

  await supabase
    .from("aulas")
    .update({ dias_semana: dias.length ? dias : null })
    .eq("id", aulaId);

  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function atualizarDuracaoCiclo(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const cicloId = String(formData.get("cicloId") || "");
  const duracao = Number(formData.get("duracaoSemanas") || 4);
  const { supabase } = await assertDono(alunoId);
  await assertCicloDoAluno(supabase, alunoId, cicloId);

  await supabase.from("ciclos").update({ duracao_semanas: duracao }).eq("id", cicloId);
  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function criarAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const cicloId = String(formData.get("cicloId") || "");
  const nome = String(formData.get("nome") || "Nova aula");
  const { supabase } = await assertDono(alunoId);
  await assertCicloDoAluno(supabase, alunoId, cicloId);

  const { count } = await supabase
    .from("aulas")
    .select("id", { count: "exact", head: true })
    .eq("ciclo_id", cicloId);

  await supabase.from("aulas").insert({ ciclo_id: cicloId, nome, ordem: count ?? 0 });
  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function removerAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const aulaId = String(formData.get("aulaId") || "");
  const { supabase } = await assertDono(alunoId);
  await assertAulaDoAluno(supabase, alunoId, aulaId);

  await supabase.from("aulas").delete().eq("id", aulaId);
  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function moverAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const cicloId = String(formData.get("cicloId") || "");
  const aulaId = String(formData.get("aulaId") || "");
  const direcao = String(formData.get("direcao") || "");
  const { supabase } = await assertDono(alunoId);
  await assertCicloDoAluno(supabase, alunoId, cicloId);

  const { data: aulas } = await supabase
    .from("aulas")
    .select("id, ordem")
    .eq("ciclo_id", cicloId)
    .order("ordem", { ascending: true });
  if (!aulas) return;

  const i = aulas.findIndex((a) => a.id === aulaId);
  const j = direcao === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= aulas.length) return;

  await supabase.from("aulas").update({ ordem: aulas[j].ordem }).eq("id", aulas[i].id);
  await supabase.from("aulas").update({ ordem: aulas[i].ordem }).eq("id", aulas[j].id);

  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function moverExercicioAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const aulaId = String(formData.get("aulaId") || "");
  const aulaExercicioId = String(formData.get("aulaExercicioId") || "");
  const direcao = String(formData.get("direcao") || "");
  const { supabase } = await assertDono(alunoId);
  await assertAulaDoAluno(supabase, alunoId, aulaId);

  const { data: exs } = await supabase
    .from("aula_exercicios")
    .select("id, ordem")
    .eq("aula_id", aulaId)
    .order("ordem", { ascending: true });
  if (!exs) return;

  const i = exs.findIndex((e) => e.id === aulaExercicioId);
  const j = direcao === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= exs.length) return;

  await supabase.from("aula_exercicios").update({ ordem: exs[j].ordem }).eq("id", exs[i].id);
  await supabase.from("aula_exercicios").update({ ordem: exs[i].ordem }).eq("id", exs[j].id);

  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function adicionarExercicioAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const aulaId = String(formData.get("aulaId") || "");
  const exercicioId = String(formData.get("exercicioId") || "");
  const { supabase } = await assertDono(alunoId);
  await assertAulaDoAluno(supabase, alunoId, aulaId);

  const { count } = await supabase
    .from("aula_exercicios")
    .select("id", { count: "exact", head: true })
    .eq("aula_id", aulaId);

  await supabase.from("aula_exercicios").insert({
    aula_id: aulaId,
    exercicio_id: exercicioId,
    ordem: count ?? 0,
    ...camposExercicioAula(formData),
  });

  revalidatePath(`/alunos/${alunoId}/treino`);
}

// Edita um exercício já adicionado na aula — antes só dava pra remover e
// adicionar de novo (perdendo a posição/ordem). Reaproveita os mesmos campos
// de adicionarExercicioAula.
export async function atualizarExercicioAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const aulaExercicioId = String(formData.get("aulaExercicioId") || "");
  const exercicioId = String(formData.get("exercicioId") || "");
  const { supabase } = await assertDono(alunoId);
  await assertAulaExercicioDoAluno(supabase, alunoId, aulaExercicioId);

  await supabase
    .from("aula_exercicios")
    .update({
      exercicio_id: exercicioId,
      ...camposExercicioAula(formData),
    })
    .eq("id", aulaExercicioId);

  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function removerExercicioAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const aulaExercicioId = String(formData.get("aulaExercicioId") || "");
  const { supabase } = await assertDono(alunoId);
  await assertAulaExercicioDoAluno(supabase, alunoId, aulaExercicioId);

  await supabase.from("aula_exercicios").delete().eq("id", aulaExercicioId);
  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function duplicarTreinoDeOutroAluno(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const origemAlunoId = String(formData.get("origemAlunoId") || "");
  const [{ supabase, aluno }] = await Promise.all([assertDono(alunoId), assertDono(origemAlunoId)]);

  const { data: cicloOrigem } = await supabase
    .from("ciclos")
    .select("*, aulas(*, aula_exercicios(*))")
    .eq("aluno_id", origemAlunoId)
    .eq("ativo", true)
    .maybeSingle();

  if (!cicloOrigem) return;

  // encerra qualquer ciclo ativo antes de criar o novo — o banco só permite
  // um ciclo ativo por aluno, então sem isso o insert falha em silêncio
  await supabase.from("ciclos").update({ ativo: false }).eq("aluno_id", alunoId).eq("ativo", true);

  const { data: novoCiclo, error: cicloError } = await supabase
    .from("ciclos")
    .insert({
      aluno_id: alunoId,
      duracao_semanas: aluno.ciclo_duracao_padrao_semanas,
      origem_aluno_id: origemAlunoId,
    })
    .select()
    .single();
  if (cicloError) return;

  if (!novoCiclo) return;

  type AulaOrigem = {
    nome: string;
    ordem: number;
    duracao_estimada_min: number | null;
    dias_semana: number[] | null;
    aula_exercicios: {
      exercicio_id: string;
      ordem: number;
      series: number;
      repeticoes: string;
      carga_inicial: number | null;
      descanso_seg: number | null;
      eh_aquecimento: boolean;
      combina_proximo: boolean;
      tipo: "forca" | "cardio";
      duracao_min: number | null;
      intensidade: string | null;
    }[];
  };

  // cada aula (e seus exercícios) é independente das outras — roda em
  // paralelo em vez de uma esperar a outra terminar
  await Promise.all(
    ((cicloOrigem.aulas as AulaOrigem[]) ?? []).map(async (aula) => {
      const { data: novaAula } = await supabase
        .from("aulas")
        .insert({
          ciclo_id: novoCiclo.id,
          nome: aula.nome,
          ordem: aula.ordem,
          duracao_estimada_min: aula.duracao_estimada_min,
          dias_semana: aula.dias_semana,
        })
        .select()
        .single();

      if (!novaAula) return;

      const linhas = aula.aula_exercicios.map((ex) => ({
        aula_id: novaAula.id,
        exercicio_id: ex.exercicio_id,
        ordem: ex.ordem,
        series: ex.series,
        repeticoes: ex.repeticoes,
        carga_inicial: ex.carga_inicial,
        descanso_seg: ex.descanso_seg,
        eh_aquecimento: ex.eh_aquecimento,
        combina_proximo: ex.combina_proximo,
        tipo: ex.tipo,
        duracao_min: ex.duracao_min,
        intensidade: ex.intensidade,
      }));
      if (linhas.length) await supabase.from("aula_exercicios").insert(linhas);
    })
  );

  revalidatePath(`/alunos/${alunoId}/treino`);
}
