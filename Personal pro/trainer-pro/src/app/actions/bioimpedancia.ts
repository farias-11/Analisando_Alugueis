"use server";

import { createClient } from "@/lib/supabase/server";
import { requirePersonal } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

export async function registrarBioimpedancia(formData: FormData) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const alunoId = String(formData.get("alunoId") || "");
  const data = String(formData.get("data") || new Date().toISOString().slice(0, 10));

  const num = (v: FormDataEntryValue | null) => (v && String(v).trim() !== "" ? Number(v) : null);

  await supabase.from("bioimpedancias").insert({
    aluno_id: alunoId,
    data,
    peso: num(formData.get("peso")),
    percentual_gordura: num(formData.get("percentual_gordura")),
    massa_magra: num(formData.get("massa_magra")),
    massa_ossea: num(formData.get("massa_ossea")),
    agua_corporal: num(formData.get("agua_corporal")),
    registrado_por: personal.id,
  });

  revalidatePath(`/alunos/${alunoId}`);
}
