import { requireAluno } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { getExerciciosDaAula } from "@/lib/data/aluno";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";

export default async function TreinoConcluidoPage({
  params,
}: {
  params: Promise<{ aulaId: string }>;
}) {
  await requireAluno();
  const { aulaId } = await params;
  const supabase = await createClient();

  const [{ data: aula }, exercicios] = await Promise.all([
    supabase.from("aulas").select("*").eq("id", aulaId).maybeSingle(),
    getExerciciosDaAula(aulaId),
  ]);
  if (!aula) notFound();

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary">
        <PartyPopper size={40} />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Treino concluído!</h1>
        <p className="mt-1 text-sm text-muted">
          Você terminou &quot;{aula.nome}&quot; — {exercicios.length} exercícios registrados.
          Mandou bem. 💪
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <ButtonLink href="/home" className="w-full">
          Voltar para o início
        </ButtonLink>
        <ButtonLink href="/treino" variant="outline" className="w-full">
          Ver meu treino
        </ButtonLink>
      </div>
    </div>
  );
}
