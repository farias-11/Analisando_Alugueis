import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { NovoExercicioToggle } from "./novo-exercicio-toggle";
import { EditarExercicioModal } from "./editar-exercicio-modal";
import { Button } from "@/components/ui/button";
import { excluirExercicio, importarBibliotecaPadrao } from "@/app/actions/exercicios";
import { youtubeThumbnailUrl } from "@/lib/youtube";
import { Download, Trash2, Video } from "lucide-react";
import type { Exercicio } from "@/lib/types";
import Link from "next/link";

export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<{ grupo?: string }>;
}) {
  const { personal } = await requirePersonal();
  const { grupo } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("exercicios")
    .select("*, exercicio_midias(*)")
    .eq("personal_id", personal.id)
    .order("nome");
  if (grupo) query = query.eq("grupo_muscular", grupo);

  const { data: exercicios } = await query;
  const { data: grupos } = await supabase
    .from("exercicios")
    .select("grupo_muscular")
    .eq("personal_id", personal.id);
  const gruposUnicos = Array.from(new Set((grupos ?? []).map((g) => g.grupo_muscular)));

  return (
    <div className="space-y-4 p-4 md:p-0">
      <div className="flex items-center justify-between gap-2 pr-14 md:pr-0">
        <h1 className="text-xl font-bold">Biblioteca de exercícios</h1>
        <div className="flex shrink-0 gap-2">
          <form action={importarBibliotecaPadrao}>
            <Button type="submit" variant="outline" size="sm" className="gap-1.5">
              <Download size={14} /> Importar padrão
            </Button>
          </form>
          <NovoExercicioToggle />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        <Link
          href="/biblioteca"
          className={`shrink-0 rounded-pill border px-3 py-1.5 text-xs font-medium ${!grupo ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"}`}
        >
          Todos
        </Link>
        {gruposUnicos.map((g) => (
          <Link
            key={g}
            href={`/biblioteca?grupo=${encodeURIComponent(g)}`}
            className={`shrink-0 rounded-pill border px-3 py-1.5 text-xs font-medium ${grupo === g ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"}`}
          >
            {g}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(exercicios ?? []).map((ex) => {
          const thumbnail = youtubeThumbnailUrl(ex.youtube_url);
          const midiaImagem = ex.exercicio_midias?.find((m: { tipo: string; url: string }) => m.tipo === "imagem" || m.tipo === "gif");
          const capa = thumbnail ?? midiaImagem?.url ?? null;
          return (
            <Card key={ex.id} className="overflow-hidden p-0">
              <div className="relative flex h-24 items-center justify-center bg-neutral-soft text-muted-2">
                {capa ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={capa} alt="" className="h-full w-full object-cover" />
                ) : ex.midia_tipo === "upload" && ex.exercicio_midias?.length ? (
                  <Video size={28} />
                ) : (
                  <span className="text-xs">Sem mídia</span>
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-semibold">{ex.nome}</p>
                <p className="text-xs text-muted">{ex.grupo_muscular}</p>
                <div className="mt-2 flex items-center gap-3">
                  <EditarExercicioModal exercicio={ex as Exercicio} />
                  <form action={excluirExercicio}>
                    <input type="hidden" name="exercicioId" value={ex.id} />
                    <button type="submit" className="flex items-center gap-1 text-xs text-danger">
                      <Trash2 size={12} /> Excluir
                    </button>
                  </form>
                </div>
              </div>
            </Card>
          );
        })}
        {(!exercicios || exercicios.length === 0) && (
          <p className="col-span-full text-sm text-muted">Nenhum exercício cadastrado ainda.</p>
        )}
      </div>
    </div>
  );
}
