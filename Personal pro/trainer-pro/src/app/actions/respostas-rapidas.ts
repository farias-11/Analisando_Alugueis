"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePersonal } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

export async function criarRespostaRapida(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const texto = String(formData.get("texto") || "").trim();
  if (!texto) return;

  const { count } = await supabase
    .from("respostas_rapidas")
    .select("id", { count: "exact", head: true })
    .eq("personal_id", personal.id);

  await supabase.from("respostas_rapidas").insert({
    personal_id: personal.id,
    texto,
    ordem: count ?? 0,
  });

  revalidatePath("/configuracoes");
}

export async function removerRespostaRapida(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const id = String(formData.get("id") || "");
  await supabase.from("respostas_rapidas").delete().eq("id", id).eq("personal_id", personal.id);

  revalidatePath("/configuracoes");
}
