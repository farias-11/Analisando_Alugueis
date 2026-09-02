import { requireAluno } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSignedUrls } from "@/lib/supabase/signed-url";
import { TopBar } from "@/components/nav/top-bar";
import { Card, CardTitle } from "@/components/ui/card";
import { MedidasForm } from "./medidas-form";
import { FotoAnguloBlock } from "@/components/foto-angulo-block";
import { formatDataBR } from "@/lib/status";
import { Images } from "lucide-react";
import type { FotoProgresso } from "@/lib/types";

export default async function MinhasMedidasPage() {
  const { aluno } = await requireAluno();
  const supabase = await createClient();
  const [{ data: historico }, { data: fotos }] = await Promise.all([
    supabase.from("medidas").select("*").eq("aluno_id", aluno.id).order("data", { ascending: false }).limit(10),
    supabase
      .from("fotos_progresso")
      .select("*")
      .eq("aluno_id", aluno.id)
      .order("data", { ascending: false })
      .limit(30),
  ]);

  const todasFotos = (fotos ?? []) as FotoProgresso[];

  // foto mais recente de cada ângulo solicitado
  const fotoPorAngulo = new Map<string, FotoProgresso>();
  for (const f of todasFotos) {
    if (f.angulo && !fotoPorAngulo.has(f.angulo)) fotoPorAngulo.set(f.angulo, f);
  }
  // uma chamada só assina tudo que essa tela precisa (blocos por ângulo +
  // galeria), em vez de uma ida à rede por foto
  const galeriaFotos = todasFotos.slice(0, 12);
  const pathsParaAssinar = [
    ...Array.from(fotoPorAngulo.values()).map((f) => f.url),
    ...galeriaFotos.map((f) => f.url),
  ];
  const urlsPorPath = await getSignedUrls("fotos-progresso", pathsParaAssinar);

  const blocosComUrl = aluno.fotos_solicitadas.map((angulo) => ({
    angulo,
    url: fotoPorAngulo.has(angulo) ? (urlsPorPath.get(fotoPorAngulo.get(angulo)!.url) ?? null) : null,
  }));

  // galeria geral (inclui fotos avulsas do formulário de medidas, sem ângulo)
  const galeria = galeriaFotos.map((f) => ({ ...f, signedUrl: urlsPorPath.get(f.url) ?? null }));

  return (
    <div>
      <TopBar title="Minhas medidas" back="/progresso" />
      <div className="space-y-4 p-4">
        {aluno.fotos_solicitadas.length > 0 && (
          <Card>
            <CardTitle className="mb-1">Fotos pedidas pelo seu personal</CardTitle>
            <p className="mb-3 text-sm text-muted">Toque em cada bloco pra atualizar a foto.</p>
            <div className="grid grid-cols-2 gap-3">
              {blocosComUrl.map(({ angulo, url }) => (
                <FotoAnguloBlock key={angulo} angulo={angulo} fotoUrlAtual={url} />
              ))}
            </div>
          </Card>
        )}

        <Card>
          <MedidasForm />
        </Card>

        <div>
          <div className="mb-2 flex items-center justify-between px-1">
            <CardTitle>Minhas fotos</CardTitle>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Images size={13} /> {todasFotos.length}
            </span>
          </div>
          {galeria.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {galeria.map((f) => (
                <div key={f.id} className="overflow-hidden rounded-xl bg-neutral-soft">
                  {f.signedUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.signedUrl} alt={f.angulo ?? "Foto de progresso"} className="aspect-square w-full object-cover" />
                  )}
                  <p className="px-1.5 py-1 text-center text-[10px] text-muted">{formatDataBR(f.data)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-1 text-sm text-muted">Nenhuma foto enviada ainda.</p>
          )}
        </div>

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
