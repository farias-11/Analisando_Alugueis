import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { formatDataBR } from "@/lib/status";

export async function HistoricoTab({ alunoId }: { alunoId: string }) {
  const supabase = await createClient();
  const { data: ciclos } = await supabase
    .from("ciclos")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("data_inicio", { ascending: false });

  const { data: execucoesRecentes } = await supabase
    .from("execucoes")
    .select("data, aula_exercicios(exercicios(nome))")
    .eq("aluno_id", alunoId)
    .order("data", { ascending: false })
    .limit(15);

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle className="mb-3">Ciclos de treino</CardTitle>
        <div className="space-y-2">
          {(ciclos ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <span>{c.nome}</span>
              <span className="text-muted">
                {formatDataBR(c.data_inicio)} — {formatDataBR(c.data_fim)}
              </span>
            </div>
          ))}
          {(!ciclos || ciclos.length === 0) && <p className="text-sm text-muted">Nenhum ciclo registrado.</p>}
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">Últimas execuções</CardTitle>
        <div className="space-y-2">
          {((execucoesRecentes ?? []) as unknown as { data: string; aula_exercicios: { exercicios: { nome: string } | null } | null }[]).map(
            (e, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
                <span>{e.aula_exercicios?.exercicios?.nome ?? "Exercício"}</span>
                <span className="text-muted">{formatDataBR(e.data)}</span>
              </div>
            )
          )}
          {(!execucoesRecentes || execucoesRecentes.length === 0) && (
            <p className="text-sm text-muted">Nenhuma execução registrada ainda.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
