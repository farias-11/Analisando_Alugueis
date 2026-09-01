import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabNav } from "./tab-nav";
import { GeralTab } from "./tabs/geral";
import { MedidasTab } from "./tabs/medidas";
import { AvaliacoesTab } from "./tabs/avaliacoes";
import { TreinoTab } from "./tabs/treino";
import { HistoricoTab } from "./tabs/historico";
import { TicketsTab } from "./tabs/tickets";
import type { Aluno } from "@/lib/types";
import Image from "next/image";

export default async function FichaAlunoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { personal } = await requirePersonal();
  const { id } = await params;
  const { aba = "geral" } = await searchParams;

  const supabase = await createClient();
  const { data: aluno } = await supabase
    .from("alunos")
    .select("*")
    .eq("id", id)
    .eq("personal_id", personal.id)
    .maybeSingle();

  if (!aluno) notFound();
  const alunoTyped = aluno as Aluno;

  return (
    <div className="pb-6">
      <div className="p-4 md:p-0 md:pb-4">
        <Card className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-primary-soft">
            {alunoTyped.foto_url ? (
              <Image src={alunoTyped.foto_url} alt={alunoTyped.nome} fill className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-primary-dark">
                {alunoTyped.nome.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-base font-semibold">{alunoTyped.nome}</p>
            <p className="text-sm text-muted">{alunoTyped.email}</p>
          </div>
          <Badge status={alunoTyped.status_convite === "pendente" ? "pendente" : alunoTyped.status} />
        </Card>
      </div>

      <TabNav alunoId={id} aba={aba} />

      <div className="space-y-4 p-4 md:p-0 md:pt-4">
        {aba === "geral" && <GeralTab aluno={alunoTyped} />}
        {aba === "medidas" && <MedidasTab alunoId={id} />}
        {aba === "avaliacoes" && <AvaliacoesTab aluno={alunoTyped} />}
        {aba === "treino" && <TreinoTab alunoId={id} />}
        {aba === "historico" && <HistoricoTab alunoId={id} />}
        {aba === "tickets" && <TicketsTab alunoId={id} />}
      </div>
    </div>
  );
}
