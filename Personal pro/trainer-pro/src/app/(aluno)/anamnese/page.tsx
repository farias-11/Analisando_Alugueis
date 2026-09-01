import { requireAluno } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/nav/top-bar";
import { AnamneseForm } from "./anamnese-form";
import type { Anamnese } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function AnamnesePage() {
  const { aluno } = await requireAluno();
  if (!aluno.anamnese_ativa) redirect("/home");

  const supabase = await createClient();
  const { data: anamnese } = await supabase
    .from("anamneses")
    .select("*")
    .eq("aluno_id", aluno.id)
    .maybeSingle();

  return (
    <div>
      <TopBar title="Anamnese" back="/home" />
      <div className="p-4">
        <AnamneseForm anamnese={anamnese as Anamnese | null} />
      </div>
    </div>
  );
}
