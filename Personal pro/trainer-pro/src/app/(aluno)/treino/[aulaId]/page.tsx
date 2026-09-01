import { requireAluno } from "@/lib/data/current-user";
import { getExerciciosDaAula } from "@/lib/data/aluno";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/nav/top-bar";
import { Card } from "@/components/ui/card";
import { ChevronRight, PlayCircle } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AulaPage({
  params,
}: {
  params: Promise<{ aulaId: string }>;
}) {
  await requireAluno();
  const { aulaId } = await params;
  const supabase = await createClient();

  const { data: aula } = await supabase.from("aulas").select("*").eq("id", aulaId).maybeSingle();
  if (!aula) notFound();

  const exercicios = await getExerciciosDaAula(aulaId);

  return (
    <div>
      <TopBar title={aula.nome} back="/treino" />
      <div className="space-y-3 p-4">
        {exercicios.map((ex, i) => (
          <Link key={ex.id} href={`/treino/${aulaId}/exercicio/${ex.id}`}>
            <Card className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-dark">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{ex.exercicio.nome}</p>
                <p className="text-xs text-muted">
                  {ex.series}x {ex.repeticoes}
                  {ex.carga_inicial ? ` · ${ex.carga_inicial}kg` : ""}
                </p>
              </div>
              <PlayCircle className="text-primary" size={22} />
              <ChevronRight className="text-muted-2" size={18} />
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
