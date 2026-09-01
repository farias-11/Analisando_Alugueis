"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

export async function registrarSerie(input: {
  aulaExercicioId: string;
  aulaId: string;
  serieNumero: number;
  carga: number | null;
  repeticoes: number | null;
}) {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  await supabase.from("execucoes").insert({
    aula_exercicio_id: input.aulaExercicioId,
    aluno_id: aluno.id,
    serie_numero: input.serieNumero,
    carga: input.carga,
    repeticoes: input.repeticoes,
  });

  revalidatePath(`/treino/${input.aulaId}/exercicio/${input.aulaExercicioId}`);
}

export async function registrarTodasAsSeries(input: {
  aulaExercicioId: string;
  aulaId: string;
  totalSeries: number;
  carga: number | null;
  repeticoes: number | null;
}) {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  const linhas = Array.from({ length: input.totalSeries }, (_, i) => ({
    aula_exercicio_id: input.aulaExercicioId,
    aluno_id: aluno.id,
    serie_numero: i + 1,
    carga: input.carga,
    repeticoes: input.repeticoes,
  }));

  await supabase.from("execucoes").insert(linhas);
  revalidatePath(`/treino/${input.aulaId}/exercicio/${input.aulaExercicioId}`);
}
