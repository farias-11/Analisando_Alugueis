import { requirePersonal } from "@/lib/data/current-user";
import { listarAlunos } from "@/lib/data/alunos";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusPagamentoExibicao } from "@/lib/status";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { FiltrosAlunos } from "./filtros";

export default async function ListaAlunosPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    pagamento?: string;
    treino?: string;
    status?: string;
    avaliacao?: string;
  }>;
}) {
  const { personal } = await requirePersonal();
  const filtros = await searchParams;
  const alunos = await listarAlunos(personal.id, filtros);

  return (
    <div className="space-y-4 p-4 md:p-0">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Alunos</h1>
        <ButtonLink href="/alunos/convidar" size="sm" className="gap-1.5">
          <UserPlus size={16} /> Convidar
        </ButtonLink>
      </div>

      <FiltrosAlunos />

      <div className="space-y-2">
        {alunos.map((aluno) => (
          <Link key={aluno.id} href={`/alunos/${aluno.id}`}>
            <Card className="flex items-center gap-3">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-primary-soft">
                {aluno.foto_url ? (
                  <Image src={aluno.foto_url} alt={aluno.nome} fill className="object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary-dark">
                    {aluno.nome.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold">{aluno.nome}</p>
                  {aluno.status === "inativo" && <Badge status="inativo" />}
                </div>
                <p className="text-xs text-muted">{aluno.objetivo || "Sem objetivo definido"}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge
                  status={
                    aluno.status_convite === "pendente" ? "pendente" : statusPagamentoExibicao(aluno)
                  }
                />
                {aluno.statusTreino && <Badge status={aluno.statusTreino} />}
              </div>
            </Card>
          </Link>
        ))}
        {alunos.length === 0 && (
          <p className="px-1 text-sm text-muted">Nenhum aluno encontrado.</p>
        )}
      </div>
    </div>
  );
}
