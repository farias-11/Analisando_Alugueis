import { requirePersonal } from "@/lib/data/current-user";
import { ConvidarAlunoForm } from "./convidar-form";

export default async function ConvidarAlunoPage() {
  const { personal } = await requirePersonal();
  return (
    <div className="space-y-4 p-4 md:max-w-lg md:p-0">
      <h1 className="text-xl font-bold">Convidar aluno</h1>
      <ConvidarAlunoForm personalNome={personal.nome} />
    </div>
  );
}
