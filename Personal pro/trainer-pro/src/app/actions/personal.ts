"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePersonal } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

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
