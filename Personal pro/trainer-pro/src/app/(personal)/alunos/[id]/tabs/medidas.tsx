import { createClient } from "@/lib/supabase/server";
import { getGraficoPeso } from "@/lib/data/graficos";
import { getSignedUrl } from "@/lib/supabase/signed-url";
import { Card, CardTitle } from "@/components/ui/card";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { formatDataBR } from "@/lib/status";
import Image from "next/image";

export async function MedidasTab({ alunoId }: { alunoId: string }) {
  const supabase = await createClient();
  const [{ data: medidas }, { data: fotos }, pesoChart] = await Promise.all([
    supabase.from("medidas").select("*").eq("aluno_id", alunoId).order("data", { ascending: false }),
    supabase
      .from("fotos_progresso")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("data", { ascending: false })
      .limit(8),
    getGraficoPeso(alunoId),
  ]);

  const fotosComUrl = await Promise.all(
    (fotos ?? []).map(async (f) => ({ ...f, signedUrl: await getSignedUrl("fotos-progresso", f.url) }))
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle className="mb-2">Evolução de peso</CardTitle>
        <SimpleLineChart data={pesoChart} unidade="kg" />
      </Card>

      {fotosComUrl.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Fotos de evolução</CardTitle>
          <div className="flex gap-2 overflow-x-auto">
            {fotosComUrl.map((f) => (
              <div key={f.id} className="shrink-0 text-center">
                <div className="relative h-24 w-20 overflow-hidden rounded-lg bg-neutral-soft">
                  {f.signedUrl && <Image src={f.signedUrl} alt="" fill className="object-cover" />}
                </div>
                <p className="mt-1 text-[10px] text-muted">{formatDataBR(f.data)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <CardTitle className="mb-3">Histórico de medidas</CardTitle>
        <div className="space-y-2">
          {(medidas ?? []).map((m) => (
            <div key={m.id} className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
              <span className="font-medium">{formatDataBR(m.data)}</span>
              <span className="text-muted">
                {m.peso ?? "—"}kg · {m.percentual_gordura ?? "—"}% · peito {m.peito ?? "—"} · cintura{" "}
                {m.cintura ?? "—"}
              </span>
            </div>
          ))}
          {(!medidas || medidas.length === 0) && (
            <p className="text-sm text-muted">Nenhuma medida lançada ainda.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
