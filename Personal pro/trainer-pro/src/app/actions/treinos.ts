"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePersonal } from "@/lib/data/current-user";
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
export async function renovarCiclo(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const cicloAntigoId = String(formData.get("cicloId") || "");
  const { supabase, aluno } = await assertDono(alunoId);

  await supabase.from("ciclos").update({ ativo: false }).eq("id", cicloAntigoId);

  const { data: novoCiclo } = await supabase
    .from("ciclos")
    .insert({ aluno_id: alunoId, duracao_semanas: aluno.ciclo_duracao_padrao_semanas })
    .select()
    .single();

  if (novoCiclo) {
    const { data: aulasAntigas } = await supabase
      .from("aulas")
      .select("*, aula_exercicios(*)")
      .eq("ciclo_id", cicloAntigoId)
      .order("ordem");

    for (const aula of aulasAntigas ?? []) {
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
      if (!novaAula) continue;

      const exs = (aula.aula_exercicios ?? []) as {
        exercicio_id: string;
        ordem: number;
        series: number;
        repeticoes: string;
        carga_inicial: number | null;
        descanso_seg: number | null;
      }[];
      if (exs.length) {
        await supabase.from("aula_exercicios").insert(
          exs.map((ex) => ({
            aula_id: novaAula.id,
            exercicio_id: ex.exercicio_id,
            ordem: ex.ordem,
            series: ex.series,
            repeticoes: ex.repeticoes,
            carga_inicial: ex.carga_inicial,
            descanso_seg: ex.descanso_seg,
          }))
        );
      }
    }
  }

  revalidatePath(`/alunos/${alunoId}`);
  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function atualizarDiasSemanaAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const aulaId = String(formData.get("aulaId") || "");
  const dias = formData.getAll("dias").map(Number);
  const { supabase } = await assertDono(alunoId);

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

  await supabase.from("ciclos").update({ duracao_semanas: duracao }).eq("id", cicloId);
  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function criarAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const cicloId = String(formData.get("cicloId") || "");
  const nome = String(formData.get("nome") || "Nova aula");
  const { supabase } = await assertDono(alunoId);

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

  await supabase.from("aulas").delete().eq("id", aulaId);
  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function moverAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const cicloId = String(formData.get("cicloId") || "");
  const aulaId = String(formData.get("aulaId") || "");
  const direcao = String(formData.get("direcao") || "");
  const { supabase } = await assertDono(alunoId);

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
  const series = Number(formData.get("series") || 3);
  const repeticoes = String(formData.get("repeticoes") || "10-12");
  const cargaInicial = formData.get("cargaInicial") ? Number(formData.get("cargaInicial")) : null;
  const descansoSeg = Number(formData.get("descansoSeg") || 60);
  const { supabase } = await assertDono(alunoId);

  const { count } = await supabase
    .from("aula_exercicios")
    .select("id", { count: "exact", head: true })
    .eq("aula_id", aulaId);

  await supabase.from("aula_exercicios").insert({
    aula_id: aulaId,
    exercicio_id: exercicioId,
    ordem: count ?? 0,
    series,
    repeticoes,
    carga_inicial: cargaInicial,
    descanso_seg: descansoSeg,
  });

  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function removerExercicioAula(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const aulaExercicioId = String(formData.get("aulaExercicioId") || "");
  const { supabase } = await assertDono(alunoId);

  await supabase.from("aula_exercicios").delete().eq("id", aulaExercicioId);
  revalidatePath(`/alunos/${alunoId}/treino`);
}

export async function duplicarTreinoDeOutroAluno(formData: FormData) {
  const alunoId = String(formData.get("alunoId") || "");
  const origemAlunoId = String(formData.get("origemAlunoId") || "");
  const { supabase, aluno } = await assertDono(alunoId);
  await assertDono(origemAlunoId);

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
    .insert({ aluno_id: alunoId, duracao_semanas: aluno.ciclo_duracao_padrao_semanas })
    .select()
    .single();
  if (cicloError) return;

  if (!novoCiclo) return;

  type AulaOrigem = { nome: string; ordem: number; duracao_estimada_min: number | null; dias_semana: number[] | null; aula_exercicios: { exercicio_id: string; ordem: number; series: number; repeticoes: string; carga_inicial: number | null; descanso_seg: number | null }[] };

  for (const aula of (cicloOrigem.aulas as AulaOrigem[]) ?? []) {
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

    if (!novaAula) continue;

    const linhas = aula.aula_exercicios.map((ex) => ({
      aula_id: novaAula.id,
      exercicio_id: ex.exercicio_id,
      ordem: ex.ordem,
      series: ex.series,
      repeticoes: ex.repeticoes,
      carga_inicial: ex.carga_inicial,
      descanso_seg: ex.descanso_seg,
    }));
    if (linhas.length) await supabase.from("aula_exercicios").insert(linhas);
  }

  revalidatePath(`/alunos/${alunoId}/treino`);
}
