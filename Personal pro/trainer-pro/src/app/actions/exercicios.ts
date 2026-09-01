"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePersonal } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

export type CriarExercicioState = { error?: string } | undefined;

function tipoMidia(file: File): "video" | "gif" | "imagem" {
  if (file.type === "image/gif") return "gif";
  if (file.type.startsWith("video/")) return "video";
  return "imagem";
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
    return { error: "Cole o link do YouTube ou troque para upload de arquivo." };
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
    for (const arquivo of arquivos) {
      if (!arquivo || arquivo.size === 0) continue;
      const path = `${exercicio.id}/${Date.now()}-${arquivo.name}`;
      const { data: upload } = await supabase.storage
        .from("exercicios")
        .upload(path, arquivo, { contentType: arquivo.type });
      if (upload) {
        const { data: pub } = supabase.storage.from("exercicios").getPublicUrl(upload.path);
        await supabase.from("exercicio_midias").insert({
          exercicio_id: exercicio.id,
          url: pub.publicUrl,
          tipo: tipoMidia(arquivo),
        });
      }
    }
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
