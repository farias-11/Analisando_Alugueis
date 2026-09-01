"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAluno, requirePersonal } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

export async function marcarNotificacaoLida(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id") || "");
  await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
  revalidatePath("/notificacoes");
}

export async function marcarTodasLidasAluno() {
  const { aluno } = await requireAluno();
  const supabase = await createClient();
  await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("aluno_id", aluno.id)
    .eq("destinatario_tipo", "aluno")
    .eq("lida", false);
  revalidatePath("/notificacoes");
}

export async function marcarTodasLidasPersonal() {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  await supabase
    .from("notificacoes")
    .update({ lida: true })
    .eq("personal_id", personal.id)
    .eq("destinatario_tipo", "personal")
    .eq("lida", false);
  revalidatePath("/notificacoes");
}
