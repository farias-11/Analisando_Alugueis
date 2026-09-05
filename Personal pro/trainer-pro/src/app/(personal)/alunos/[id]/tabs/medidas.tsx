import { createClient } from "@/lib/supabase/server";
import { getGraficoPeso } from "@/lib/data/graficos";
import { getSignedUrls } from "@/lib/supabase/signed-url";
import { Card, CardTitle } from "@/components/ui/card";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { ComparadorFotos, type FotoComparavel } from "@/components/comparador-fotos";
import { formatDataBR } from "@/lib/status";
import { ShieldOff } from "lucide-react";
import Image from "next/image";

export async function MedidasTab({ alunoId, consentimentoAceito }: { alunoId: string; consentimentoAceito: boolean }) {
  const supabase = await createClient();
  const [{ data: medidas }, { data: fotos }, pesoChart] = await Promise.all([
    supabase.from("medidas").select("*").eq("aluno_id", alunoId).order("data", { ascending: false }),
    supabase
      .from("fotos_progresso")
      .select("*")
      .eq("aluno_id", alunoId)
      .order("data", { ascending: false })
      .limit(30),
    getGraficoPeso(alunoId),
  ]);

  const todasFotos = fotos ?? [];
  // uma chamada só assina todas as fotos de uma vez, em vez de uma ida à rede
  // por foto (uma ficha com muitos meses de fotos tinha isso como o gargalo)
  const urlsPorPath = await getSignedUrls(
    "fotos-progresso",
    todasFotos.map((f) => f.url)
  );
  const fotosComUrl = todasFotos.map((f) => ({ ...f, signedUrl: urlsPorPath.get(f.url) ?? null }));

  // agrupa por ângulo (mais antiga primeiro) pra alimentar o comparador —
  // fotos avulsas sem ângulo (do formulário de medidas) ficam de fora, só
  // aparecem na tira "Fotos de evolução" abaixo
  const porAngulo: Record<string, FotoComparavel[]> = {};
  for (const f of [...fotosComUrl].reverse()) {
    if (!f.angulo) continue;
    (porAngulo[f.angulo] ??= []).push({ data: f.data, signedUrl: f.signedUrl });
  }

  return (
    <div className="space-y-4">
      {!consentimentoAceito && (
        <Card className="flex items-center gap-2 border-warning/30 bg-warning-soft">
          <ShieldOff size={16} className="shrink-0 text-warning" />
          <p className="text-sm text-warning">
            Este aluno revogou o consentimento de dados de saúde — medidas e fotos ficam ocultas até
            ele consentir de novo pela tela &quot;Meus dados&quot;.
          </p>
        </Card>
      )}
      <Card>
        <CardTitle className="mb-2">Evolução de peso</CardTitle>
        <SimpleLineChart data={pesoChart} unidade="kg" />
      </Card>

      {Object.keys(porAngulo).length > 0 && (
        <Card>
          <CardTitle className="mb-3">Comparar evolução</CardTitle>
          <ComparadorFotos porAngulo={porAngulo} />
        </Card>
      )}

      {fotosComUrl.length > 0 && (
        <Card>
          <CardTitle className="mb-3">Fotos de evolução</CardTitle>
          <div className="flex gap-2 overflow-x-auto">
            {fotosComUrl.map((f) => (
              <div key={f.id} className="shrink-0 text-center">
                <div className="relative h-24 w-20 overflow-hidden rounded-lg bg-neutral-soft">
                  {f.signedUrl && <Image src={f.signedUrl} alt="" fill sizes="80px" className="object-cover" />}
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
