"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePersonal } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function assertDonoTemplate(templateId: string) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const { data: template } = await supabase
    .from("templates")
    .select("id")
    .eq("id", templateId)
    .eq("personal_id", personal.id)
    .maybeSingle();
  if (!template) throw new Error("Template não encontrado.");
  return { supabase, personal };
}

export type CriarTemplateState = { error?: string } | undefined;

export async function criarTemplateVazio(
  _prevState: CriarTemplateState,
  formData: FormData
): Promise<CriarTemplateState> {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim() || null;
  if (!nome) return { error: "Dê um nome ao template." };

  const { data: template, error } = await supabase
    .from("templates")
    .insert({ personal_id: personal.id, nome, descricao })
    .select()
    .single();
  if (error || !template) return { error: "Não foi possível criar o template." };

  redirect(`/templates/${template.id}`);
}

export async function excluirTemplate(formData: FormData) {
  const templateId = String(formData.get("templateId") || "");
  const { supabase } = await assertDonoTemplate(templateId);
  await supabase.from("templates").delete().eq("id", templateId);
  redirect("/templates");
}

export async function criarTemplateAula(formData: FormData) {
  const templateId = String(formData.get("templateId") || "");
  const nome = String(formData.get("nome") || "Nova aula");
  const { supabase } = await assertDonoTemplate(templateId);

  const { count } = await supabase
    .from("template_aulas")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  await supabase.from("template_aulas").insert({ template_id: templateId, nome, ordem: count ?? 0 });
  revalidatePath(`/templates/${templateId}`);
}

export async function removerTemplateAula(formData: FormData) {
  const templateId = String(formData.get("templateId") || "");
  const templateAulaId = String(formData.get("templateAulaId") || "");
  const { supabase } = await assertDonoTemplate(templateId);

  await supabase.from("template_aulas").delete().eq("id", templateAulaId);
  revalidatePath(`/templates/${templateId}`);
}

export async function moverTemplateAula(formData: FormData) {
  const templateId = String(formData.get("templateId") || "");
  const templateAulaId = String(formData.get("templateAulaId") || "");
  const direcao = String(formData.get("direcao") || "");
  const { supabase } = await assertDonoTemplate(templateId);

  const { data: aulas } = await supabase
    .from("template_aulas")
    .select("id, ordem")
    .eq("template_id", templateId)
    .order("ordem", { ascending: true });
  if (!aulas) return;

  const i = aulas.findIndex((a) => a.id === templateAulaId);
  const j = direcao === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= aulas.length) return;

  await supabase.from("template_aulas").update({ ordem: aulas[j].ordem }).eq("id", aulas[i].id);
  await supabase.from("template_aulas").update({ ordem: aulas[i].ordem }).eq("id", aulas[j].id);
  revalidatePath(`/templates/${templateId}`);
}

export async function atualizarDiasSemanaTemplateAula(formData: FormData) {
  const templateId = String(formData.get("templateId") || "");
  const templateAulaId = String(formData.get("templateAulaId") || "");
  const dias = formData.getAll("dias").map(Number);
  const { supabase } = await assertDonoTemplate(templateId);

  await supabase
    .from("template_aulas")
    .update({ dias_semana: dias.length ? dias : null })
    .eq("id", templateAulaId);
  revalidatePath(`/templates/${templateId}`);
}

export async function adicionarExercicioTemplateAula(formData: FormData) {
  const templateId = String(formData.get("templateId") || "");
  const templateAulaId = String(formData.get("templateAulaId") || "");
  const exercicioId = String(formData.get("exercicioId") || "");
  const series = Number(formData.get("series") || 3);
  const repeticoes = String(formData.get("repeticoes") || "10-12");
  const cargaInicial = formData.get("cargaInicial") ? Number(formData.get("cargaInicial")) : null;
  const descansoSeg = Number(formData.get("descansoSeg") || 60);
  const { supabase } = await assertDonoTemplate(templateId);

  const { count } = await supabase
    .from("template_aula_exercicios")
    .select("id", { count: "exact", head: true })
    .eq("template_aula_id", templateAulaId);

  await supabase.from("template_aula_exercicios").insert({
    template_aula_id: templateAulaId,
    exercicio_id: exercicioId,
    ordem: count ?? 0,
    series,
    repeticoes,
    carga_inicial: cargaInicial,
    descanso_seg: descansoSeg,
  });
  revalidatePath(`/templates/${templateId}`);
}

export async function removerExercicioTemplateAula(formData: FormData) {
  const templateId = String(formData.get("templateId") || "");
  const templateAulaExercicioId = String(formData.get("templateAulaExercicioId") || "");
  const { supabase } = await assertDonoTemplate(templateId);

  await supabase.from("template_aula_exercicios").delete().eq("id", templateAulaExercicioId);
  revalidatePath(`/templates/${templateId}`);
}

export async function moverExercicioTemplateAula(formData: FormData) {
  const templateId = String(formData.get("templateId") || "");
  const templateAulaId = String(formData.get("templateAulaId") || "");
  const templateAulaExercicioId = String(formData.get("templateAulaExercicioId") || "");
  const direcao = String(formData.get("direcao") || "");
  const { supabase } = await assertDonoTemplate(templateId);

  const { data: exs } = await supabase
    .from("template_aula_exercicios")
    .select("id, ordem")
    .eq("template_aula_id", templateAulaId)
    .order("ordem", { ascending: true });
  if (!exs) return;

  const i = exs.findIndex((e) => e.id === templateAulaExercicioId);
  const j = direcao === "up" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= exs.length) return;

  await supabase.from("template_aula_exercicios").update({ ordem: exs[j].ordem }).eq("id", exs[i].id);
  await supabase.from("template_aula_exercicios").update({ ordem: exs[i].ordem }).eq("id", exs[j].id);
  revalidatePath(`/templates/${templateId}`);
}

export async function criarTemplateDeAluno(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const descricao = String(formData.get("descricao") || "").trim() || null;
  const origemAlunoId = String(formData.get("origemAlunoId") || "");

  if (!nome || !origemAlunoId) return;

  const { data: ciclo } = await supabase
    .from("ciclos")
    .select("*, aulas(*, aula_exercicios(*))")
    .eq("aluno_id", origemAlunoId)
    .eq("ativo", true)
    .maybeSingle();

  if (!ciclo) return;

  const { data: template } = await supabase
    .from("templates")
    .insert({ personal_id: personal.id, nome, descricao })
    .select()
    .single();

  if (!template) return;

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
    }[];
  };

  for (const aula of (ciclo.aulas as AulaOrigem[]) ?? []) {
    const { data: templateAula } = await supabase
      .from("template_aulas")
      .insert({
        template_id: template.id,
        nome: aula.nome,
        ordem: aula.ordem,
        duracao_estimada_min: aula.duracao_estimada_min,
        dias_semana: aula.dias_semana,
      })
      .select()
      .single();
    if (!templateAula) continue;

    const linhas = aula.aula_exercicios.map((ex) => ({
      template_aula_id: templateAula.id,
      exercicio_id: ex.exercicio_id,
      ordem: ex.ordem,
      series: ex.series,
      repeticoes: ex.repeticoes,
      carga_inicial: ex.carga_inicial,
      descanso_seg: ex.descanso_seg,
    }));
    if (linhas.length) await supabase.from("template_aula_exercicios").insert(linhas);
  }

  revalidatePath("/templates");
}

export async function aplicarTemplateAoAluno(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const templateId = String(formData.get("templateId") || "");
  const alunoId = String(formData.get("alunoId") || "");

  const { data: aluno } = await supabase
    .from("alunos")
    .select("ciclo_duracao_padrao_semanas")
    .eq("id", alunoId)
    .eq("personal_id", personal.id)
    .maybeSingle();
  if (!aluno) return;

  const { data: templateAulas } = await supabase
    .from("template_aulas")
    .select("*, template_aula_exercicios(*)")
    .eq("template_id", templateId)
    .order("ordem");

  // encerra qualquer ciclo ativo antes de criar o novo — o banco só permite
  // um ciclo ativo por aluno, então sem isso o insert falha em silêncio
  await supabase.from("ciclos").update({ ativo: false }).eq("aluno_id", alunoId).eq("ativo", true);

  const { data: novoCiclo, error: cicloError } = await supabase
    .from("ciclos")
    .insert({ aluno_id: alunoId, duracao_semanas: aluno.ciclo_duracao_padrao_semanas })
    .select()
    .single();
  if (cicloError || !novoCiclo) return;

  type TemplateAula = {
    nome: string;
    ordem: number;
    duracao_estimada_min: number | null;
    dias_semana: number[] | null;
    template_aula_exercicios: {
      exercicio_id: string;
      ordem: number;
      series: number;
      repeticoes: string;
      carga_inicial: number | null;
      descanso_seg: number | null;
    }[];
  };

  for (const aula of (templateAulas as TemplateAula[]) ?? []) {
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

    const linhas = aula.template_aula_exercicios.map((ex) => ({
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

  redirect(`/alunos/${alunoId}?aba=treino`);
}
