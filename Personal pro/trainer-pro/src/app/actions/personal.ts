"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePersonal } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";
import { TIPOS_NOTIFICACAO_PERSONAL } from "@/lib/constantes";

export async function atualizarPerfilPersonal(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const nome = String(formData.get("nome") || "").trim();
  const whatsappNumero = String(formData.get("whatsappNumero") || "").replace(/\D/g, "");

  if (!nome || !whatsappNumero) return;

  await supabase
    .from("personals")
    .update({ nome, whatsapp_numero: whatsappNumero })
    .eq("id", personal.id);

  revalidatePath("/configuracoes");
}

export async function atualizarFotoPersonal(formData: FormData) {
  const { personal } = await requirePersonal();
  const foto = formData.get("foto") as File | null;
  if (!foto || foto.size === 0) return;

  const admin = createAdminClient();
  const path = `personal/${personal.id}/${Date.now()}-${foto.name}`;
  const { data: upload, error } = await admin.storage
    .from("avatares")
    .upload(path, foto, { contentType: foto.type });
  if (error || !upload) return;

  const { data: pub } = admin.storage.from("avatares").getPublicUrl(upload.path);
  const supabase = await createClient();
  await supabase.from("personals").update({ foto_url: pub.publicUrl }).eq("id", personal.id);

  revalidatePath("/configuracoes");
}

export async function atualizarPreferenciasNotificacaoPersonal(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const preferencias: Record<string, boolean> = {};
  for (const { tipo } of TIPOS_NOTIFICACAO_PERSONAL) {
    preferencias[tipo] = formData.get(`pref_${tipo}`) === "on";
  }

  await supabase.from("personals").update({ notificacoes_preferencias: preferencias }).eq("id", personal.id);
  revalidatePath("/configuracoes");
}

export async function atualizarResumoDiario(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const ativo = formData.get("resumoDiarioAtivo") === "on";
  await supabase.from("personals").update({ resumo_diario_ativo: ativo }).eq("id", personal.id);
  revalidatePath("/configuracoes");
}
