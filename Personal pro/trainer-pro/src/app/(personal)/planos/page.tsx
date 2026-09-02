import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { NovoPlanoToggle } from "./novo-plano-toggle";
import { EditarPlanoModal } from "./editar-plano-modal";
import { excluirPlano } from "@/app/actions/planos";
import { formatMoedaBR } from "@/lib/status";
import { Trash2, Users } from "lucide-react";
import type { Plano } from "@/lib/types";

export default async function PlanosPage() {
  const { personal } = await requirePersonal();
  const supabase = await createClient();

  const [{ data: planos }, { data: contagens }] = await Promise.all([
    supabase.from("planos").select("*").eq("personal_id", personal.id).order("valor"),
    supabase.from("alunos").select("plano_id").eq("personal_id", personal.id).not("plano_id", "is", null),
  ]);

  const alunosPorPlano = new Map<string, number>();
  for (const a of contagens ?? []) {
    if (a.plano_id) alunosPorPlano.set(a.plano_id, (alunosPorPlano.get(a.plano_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-4 p-4 md:max-w-lg md:p-0">
      <div className="flex items-center justify-between pr-14 md:pr-0">
        <h1 className="text-xl font-bold">Planos</h1>
        <NovoPlanoToggle />
      </div>
      <p className="text-sm text-muted">
        Cadastre os valores e a recorrência que você cobra — depois é só escolher o plano na ficha de cada aluno,
        sem precisar redigitar valor e vencimento toda vez.
      </p>

      <div className="space-y-2">
        {((planos ?? []) as Plano[]).map((p) => (
          <Card key={p.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{p.nome}</p>
                <p className="text-xs text-muted">
                  {formatMoedaBR(p.valor)} · {p.recorrencia_meses === 1 ? "mensal" : `a cada ${p.recorrencia_meses} meses`}
                  {p.dia_pagamento ? ` · vence dia ${p.dia_pagamento}` : ""}
                </p>
                {alunosPorPlano.get(p.id) ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <Users size={12} /> {alunosPorPlano.get(p.id)} aluno{alunosPorPlano.get(p.id)! > 1 ? "s" : ""} nesse plano
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <EditarPlanoModal plano={p} />
                <form action={excluirPlano}>
                  <input type="hidden" name="planoId" value={p.id} />
                  <button type="submit" className="flex items-center gap-1 text-xs text-danger">
                    <Trash2 size={12} /> Excluir
                  </button>
                </form>
              </div>
            </div>
          </Card>
        ))}
        {(!planos || planos.length === 0) && (
          <p className="text-sm text-muted">Nenhum plano cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
