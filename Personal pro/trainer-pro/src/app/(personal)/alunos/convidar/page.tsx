import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { ConvidarAlunoForm } from "./convidar-form";
import type { Plano } from "@/lib/types";

export default async function ConvidarAlunoPage() {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const { data: planos } = await supabase.from("planos").select("*").eq("personal_id", personal.id).order("valor");

  return (
    <div className="space-y-4 p-4 md:max-w-lg md:p-0">
      <h1 className="text-xl font-bold">Convidar aluno</h1>
      <ConvidarAlunoForm personalNome={personal.nome} planos={(planos ?? []) as Plano[]} />
    </div>
  );
}
