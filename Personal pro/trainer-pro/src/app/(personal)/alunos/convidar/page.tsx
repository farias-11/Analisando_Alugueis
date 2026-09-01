import { ConvidarAlunoForm } from "./convidar-form";

export default function ConvidarAlunoPage() {
  return (
    <div className="space-y-4 p-4 md:max-w-lg md:p-0">
      <h1 className="text-xl font-bold">Convidar aluno</h1>
      <ConvidarAlunoForm />
    </div>
  );
}
