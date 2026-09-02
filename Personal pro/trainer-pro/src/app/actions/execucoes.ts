"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/data/current-user";
import { revalidatePath } from "next/cache";

// aluno_id sempre vem da sessão (nunca do client), então isso não deixa um
// aluno gravar execução em nome de outro. Mas sem checar o aulaExercicioId,
// ele podia chamar a action com o id de um exercício de QUALQUER aluno
// (inclusive de outro personal) e inflar a própria aderência/gráfico de
// carga com exercícios que nunca foram atribuídos a ele.
async function assertAulaExercicioDoAluno(
  supabase: Awaited<ReturnType<typeof createClient>>,
  alunoId: string,
  aulaExercicioId: string
) {
  const { data } = await supabase
    .from("aula_exercicios")
    .select("id, aulas(ciclos(aluno_id))")
    .eq("id", aulaExercicioId)
    .maybeSingle();
  const donoId = (data as unknown as { aulas: { ciclos: { aluno_id: string } | null } | null } | null)?.aulas?.ciclos
    ?.aluno_id;
  if (donoId !== alunoId) throw new Error("Exercício não encontrado para você.");
}

// upsert por (aula_exercicio_id, aluno_id, serie_numero, dia) — reenviar a
// mesma série no mesmo dia atualiza o registro em vez de duplicar, o que
// permite ao aluno corrigir carga/repetições mesmo depois de já ter marcado
// a série (ou o exercício inteiro) como concluído.
export async function registrarSerie(input: {
  aulaExercicioId: string;
  aulaId: string;
  serieNumero: number;
  carga: number | null;
  repeticoes: number | null;
}) {
  const { aluno } = await requireAluno();
  const supabase = await createClient();
  await assertAulaExercicioDoAluno(supabase, aluno.id, input.aulaExercicioId);

  await supabase.from("execucoes").upsert(
    {
      aula_exercicio_id: input.aulaExercicioId,
      aluno_id: aluno.id,
      serie_numero: input.serieNumero,
      carga: input.carga,
      repeticoes: input.repeticoes,
    },
    { onConflict: "aula_exercicio_id,aluno_id,serie_numero,dia" }
  );

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
  await assertAulaExercicioDoAluno(supabase, aluno.id, input.aulaExercicioId);

  const linhas = Array.from({ length: input.totalSeries }, (_, i) => ({
    aula_exercicio_id: input.aulaExercicioId,
    aluno_id: aluno.id,
    serie_numero: i + 1,
    carga: input.carga,
    repeticoes: input.repeticoes,
  }));

  await supabase.from("execucoes").upsert(linhas, { onConflict: "aula_exercicio_id,aluno_id,serie_numero,dia" });
  revalidatePath(`/treino/${input.aulaId}/exercicio/${input.aulaExercicioId}`);
}
