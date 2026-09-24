"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePersonal } from "@/lib/data/current-user";
import { remuxParaFaststart } from "@/lib/video-faststart";
import { revalidatePath } from "next/cache";
import { EXERCICIOS_PADRAO } from "@/lib/exercicios-padrao";

export type CriarExercicioState = { error?: string } | undefined;

type SupaClient = Awaited<ReturnType<typeof createClient>>;

function tipoMidia(file: File): "video" | "gif" | "imagem" {
  if (file.type === "image/gif") return "gif";
  if (file.type.startsWith("video/")) return "video";
  return "imagem";
}

/** Sobe um arquivo de mídia pro storage e registra em exercicio_midias —
 * compartilhado entre criarExercicio/atualizarExercicio (evita duplicar a
 * mesma lógica duas vezes, ver regra em aluno.ts sobre não reimplementar a
 * mesma coisa em vários lugares). Vídeo passa pelo remux de faststart antes
 * de subir (ver video-faststart.ts) — celular grava com o metadado no fim
 * do arquivo, o que quebra o botão de tela cheia em alguns navegadores. */
async function uploadMidiaExercicio(supabase: SupaClient, exercicioId: string, arquivo: File) {
  if (!arquivo || arquivo.size === 0) return;
  const tipo = tipoMidia(arquivo);
  const bytes =
    tipo === "video" ? await remuxParaFaststart(Buffer.from(await arquivo.arrayBuffer()), arquivo.name) : arquivo;

  const path = `${exercicioId}/${Date.now()}-${arquivo.name}`;
  const { data: upload } = await supabase.storage.from("exercicios").upload(path, bytes, { contentType: arquivo.type });
  if (upload) {
    const { data: pub } = supabase.storage.from("exercicios").getPublicUrl(upload.path);
    await supabase.from("exercicio_midias").insert({ exercicio_id: exercicioId, url: pub.publicUrl, tipo });
  }
}

export async function criarExercicio(
  _prevState: CriarExercicioState,
  formData: FormData
): Promise<CriarExercicioState> {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const grupoMuscular = String(formData.get("grupoMuscular") || "").trim();
  const instrucoes = String(formData.get("instrucoes") || "").trim() || null;
  const midiaTipo = String(formData.get("midiaTipo") || "youtube") as "youtube" | "upload";
  const youtubeUrl = String(formData.get("youtubeUrl") || "").trim() || null;
  const arquivos = formData.getAll("arquivos") as File[];

  if (!nome || !grupoMuscular) {
    return { error: "Nome e grupo muscular são obrigatórios." };
  }
  if (midiaTipo === "youtube" && !youtubeUrl) {
    return { error: "Cole o link do vídeo (YouTube ou Drive) ou troque para upload de arquivo." };
  }

  const { data: exercicio, error } = await supabase
    .from("exercicios")
    .insert({
      personal_id: personal.id,
      nome,
      grupo_muscular: grupoMuscular,
      instrucoes,
      midia_tipo: midiaTipo,
      youtube_url: midiaTipo === "youtube" ? youtubeUrl : null,
    })
    .select()
    .single();

  if (error || !exercicio) {
    return { error: "Não foi possível salvar o exercício." };
  }

  if (midiaTipo === "upload") {
    // cada arquivo é independente — sobe todos em paralelo em vez de um de cada vez
    await Promise.all(arquivos.map((arquivo) => uploadMidiaExercicio(supabase, exercicio.id, arquivo)));
  }

  revalidatePath("/biblioteca");
  return undefined;
}

export async function atualizarExercicio(
  _prevState: CriarExercicioState,
  formData: FormData
): Promise<CriarExercicioState> {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const exercicioId = String(formData.get("exercicioId") || "");
  const nome = String(formData.get("nome") || "").trim();
  const grupoMuscular = String(formData.get("grupoMuscular") || "").trim();
  const instrucoes = String(formData.get("instrucoes") || "").trim() || null;
  const midiaTipo = String(formData.get("midiaTipo") || "youtube") as "youtube" | "upload";
  const youtubeUrl = String(formData.get("youtubeUrl") || "").trim() || null;
  const arquivos = formData.getAll("arquivos") as File[];

  if (!nome || !grupoMuscular) {
    return { error: "Nome e grupo muscular são obrigatórios." };
  }
  if (midiaTipo === "youtube" && !youtubeUrl) {
    return { error: "Cole o link do vídeo (YouTube ou Drive) ou troque para upload de arquivo." };
  }

  const { data: exercicio, error } = await supabase
    .from("exercicios")
    .update({
      nome,
      grupo_muscular: grupoMuscular,
      instrucoes,
      midia_tipo: midiaTipo,
      youtube_url: midiaTipo === "youtube" ? youtubeUrl : null,
    })
    .eq("id", exercicioId)
    .eq("personal_id", personal.id)
    .select()
    .single();

  if (error || !exercicio) {
    return { error: "Não foi possível salvar o exercício." };
  }

  if (midiaTipo === "upload" && arquivos.some((a) => a && a.size > 0)) {
    await Promise.all(arquivos.map((arquivo) => uploadMidiaExercicio(supabase, exercicio.id, arquivo)));
  }

  revalidatePath("/biblioteca");
  return undefined;
}

export async function excluirExercicio(formData: FormData) {
  await requirePersonal();
  const supabase = await createClient();
  const exercicioId = String(formData.get("exercicioId") || "");
  await supabase.from("exercicios").delete().eq("id", exercicioId);
  revalidatePath("/biblioteca");
}

// Biblioteca padrão (handoff, seção 4): importa de uma vez os exercícios
// comuns pra quem está começando do zero — pula os que já existem (por
// nome) pra poder clicar de novo sem duplicar depois de excluir alguns.
export async function importarBibliotecaPadrao() {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const { data: existentes } = await supabase.from("exercicios").select("nome").eq("personal_id", personal.id);
  const nomesExistentes = new Set((existentes ?? []).map((e) => e.nome));

  const novos = EXERCICIOS_PADRAO.filter((e) => !nomesExistentes.has(e.nome)).map((e) => ({
    personal_id: personal.id,
    nome: e.nome,
    grupo_muscular: e.grupoMuscular,
    instrucoes: e.instrucoes,
    midia_tipo: "youtube" as const,
    youtube_url: null,
  }));

  if (novos.length) await supabase.from("exercicios").insert(novos);
  revalidatePath("/biblioteca");
}
