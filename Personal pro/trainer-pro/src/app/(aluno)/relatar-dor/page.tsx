import { TopBar } from "@/components/nav/top-bar";
import { RelatarDorForm } from "./relatar-dor-form";

export default async function RelatarDorPage({
  searchParams,
}: {
  searchParams: Promise<{ aulaExercicioId?: string; exercicioNome?: string; aulaNome?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div>
      <TopBar title="Relatar dor/desconforto" back="/treino" />
      <div className="p-4">
        <RelatarDorForm
          aulaExercicioId={sp.aulaExercicioId ?? ""}
          exercicioNome={sp.exercicioNome ?? ""}
          aulaNome={sp.aulaNome ?? ""}
        />
      </div>
    </div>
  );
}
