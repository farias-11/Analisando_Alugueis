import { requireAluno } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/nav/top-bar";
import { Card, CardTitle } from "@/components/ui/card";
import { MedidasForm } from "./medidas-form";
import { formatDataBR } from "@/lib/status";

export default async function MinhasMedidasPage() {
  const { aluno } = await requireAluno();
  const supabase = await createClient();
  const { data: historico } = await supabase
    .from("medidas")
    .select("*")
    .eq("aluno_id", aluno.id)
    .order("data", { ascending: false })
    .limit(10);

  return (
    <div>
      <TopBar title="Minhas medidas" back="/progresso" />
      <div className="space-y-4 p-4">
        <Card>
          <MedidasForm />
        </Card>

        <div>
          <CardTitle className="mb-2 px-1">Histórico</CardTitle>
          <div className="space-y-2">
            {(historico ?? []).map((m) => (
              <Card key={m.id} className="flex items-center justify-between">
                <p className="text-sm font-medium">{formatDataBR(m.data)}</p>
                <p className="text-sm text-muted">
                  {m.peso ? `${m.peso}kg` : "—"} · {m.percentual_gordura ? `${m.percentual_gordura}%` : "—"}
                </p>
              </Card>
            ))}
            {(!historico || historico.length === 0) && (
              <p className="px-1 text-sm text-muted">Nenhum registro ainda.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
