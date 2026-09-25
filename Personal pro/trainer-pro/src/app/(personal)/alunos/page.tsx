import { requirePersonal } from "@/lib/data/current-user";
import { listarAlunos } from "@/lib/data/alunos";
import { ButtonLink } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { FiltrosAlunos } from "./filtros";
import { AlunosListaSelecionavel } from "@/components/alunos-lista-selecionavel";

export default async function ListaAlunosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    pagamento?: string;
    treino?: string;
    status?: string;
    avaliacao?: string;
    semCheckin?: string;
    ordenar?: string;
  }>;
}) {
  const { personal } = await requirePersonal();
  const filtros = await searchParams;
  const { alunos, truncado } = await listarAlunos(personal.id, filtros);

  return (
    <div className="space-y-4 p-4 md:p-0">
      <div className="flex items-center justify-between pr-14 md:pr-0">
        <h1 className="text-xl font-bold">Alunos</h1>
        <ButtonLink href="/alunos/convidar" size="sm" className="gap-1.5">
          <UserPlus size={16} /> Convidar
        </ButtonLink>
      </div>

      <FiltrosAlunos />

      {truncado && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">
          Mostrando os primeiros {alunos.length} alunos. Use a busca ou os filtros pra encontrar quem procura.
        </p>
      )}

      <AlunosListaSelecionavel alunos={alunos} />
    </div>
  );
}
