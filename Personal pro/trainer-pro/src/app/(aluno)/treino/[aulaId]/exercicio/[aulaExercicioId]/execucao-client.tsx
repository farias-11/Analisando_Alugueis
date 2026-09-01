"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registrarSerie, registrarTodasAsSeries } from "@/app/actions/execucoes";
import { Button } from "@/components/ui/button";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, HeartCrack } from "lucide-react";
import type { AulaExercicio, Aula, Exercicio, ExercicioMidia } from "@/lib/types";

type Registro = AulaExercicio & { exercicio: Exercicio & { midias: ExercicioMidia[] }; aula: Aula };

const TABS = ["Geral", "Instruções", "Alvo", "Carga Máx."] as const;

export function ExecucaoClient({
  aulaId,
  aulaExercicio,
  ultimaMarca,
  proximoExercicioId,
  ehUltimoExercicio,
}: {
  aulaId: string;
  aulaExercicio: Registro;
  ultimaMarca: { carga: number | null; repeticoes: number | null } | null;
  proximoExercicioId: string | null;
  ehUltimoExercicio: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Geral");
  const [serieAtual, setSerieAtual] = useState(1);
  const [carga, setCarga] = useState(aulaExercicio.carga_inicial?.toString() ?? "");
  const [reps, setReps] = useState(aulaExercicio.repeticoes.split("-")[0] ?? "");
  const [seriesFeitas, setSeriesFeitas] = useState<number[]>([]);
  const [pending, startTransition] = useTransition();

  const embedUrl = useMemo(
    () => youtubeEmbedUrl(aulaExercicio.exercicio.youtube_url),
    [aulaExercicio.exercicio.youtube_url]
  );
  const primeiraMidiaUpload = aulaExercicio.exercicio.midias?.[0];

  function finalizarSerie() {
    startTransition(async () => {
      await registrarSerie({
        aulaExercicioId: aulaExercicio.id,
        aulaId,
        serieNumero: serieAtual,
        carga: carga ? Number(carga) : null,
        repeticoes: reps ? Number(reps) : null,
      });
      setSeriesFeitas((prev) => [...new Set([...prev, serieAtual])]);
      if (serieAtual < aulaExercicio.series) setSerieAtual(serieAtual + 1);
      router.refresh();
    });
  }

  function finalizarTodas() {
    startTransition(async () => {
      await registrarTodasAsSeries({
        aulaExercicioId: aulaExercicio.id,
        aulaId,
        totalSeries: aulaExercicio.series,
        carga: carga ? Number(carga) : null,
        repeticoes: reps ? Number(reps) : null,
      });
      setSeriesFeitas(Array.from({ length: aulaExercicio.series }, (_, i) => i + 1));
      router.refresh();
    });
  }

  const relatarDorHref = `/relatar-dor?aulaExercicioId=${aulaExercicio.id}&exercicioNome=${encodeURIComponent(
    aulaExercicio.exercicio.nome
  )}&aulaNome=${encodeURIComponent(aulaExercicio.aula.nome)}`;

  const todasAsSeriesFeitas = seriesFeitas.length >= aulaExercicio.series;
  const proximoHref = ehUltimoExercicio
    ? `/treino/${aulaId}/concluido`
    : proximoExercicioId
      ? `/treino/${aulaId}/exercicio/${proximoExercicioId}`
      : `/treino/${aulaId}`;

  return (
    <div className="space-y-4 p-4">
      <div className="overflow-hidden rounded-card bg-black">
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : primeiraMidiaUpload ? (
          primeiraMidiaUpload.tipo === "video" ? (
            <video src={primeiraMidiaUpload.url} controls className="aspect-video w-full" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primeiraMidiaUpload.url}
              alt={aulaExercicio.exercicio.nome}
              className="aspect-video w-full object-cover"
            />
          )
        ) : (
          <div className="flex aspect-video w-full items-center justify-center text-sm text-white/60">
            Sem mídia cadastrada
          </div>
        )}
      </div>

      {ultimaMarca?.carga || ultimaMarca?.repeticoes ? (
        <div className="rounded-xl bg-primary-soft px-3.5 py-2.5 text-sm font-medium text-primary-dark">
          Último treino: {ultimaMarca.carga ?? "—"}kg x {ultimaMarca.repeticoes ?? "—"} reps
        </div>
      ) : null}

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "shrink-0 border-b-2 px-3 py-2 text-sm font-medium",
              tab === t ? "border-primary text-primary" : "border-transparent text-muted"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="min-h-16 text-sm text-foreground/90">
        {tab === "Geral" && (
          <p>
            {aulaExercicio.series} séries de {aulaExercicio.repeticoes} · descanso{" "}
            {aulaExercicio.descanso_seg ?? 60}s
          </p>
        )}
        {tab === "Instruções" && (
          <p>{aulaExercicio.exercicio.instrucoes || "Sem instruções cadastradas."}</p>
        )}
        {tab === "Alvo" && <p>{aulaExercicio.repeticoes} repetições alvo por série.</p>}
        {tab === "Carga Máx." && (
          <p>{ultimaMarca?.carga ? `${ultimaMarca.carga}kg` : "Ainda sem registro."}</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Série</p>
        <div className="flex gap-2">
          {Array.from({ length: aulaExercicio.series }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setSerieAtual(n)}
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-semibold",
                serieAtual === n
                  ? "border-primary bg-primary text-white"
                  : seriesFeitas.includes(n)
                    ? "border-success/30 bg-success-soft text-success"
                    : "border-border bg-surface text-foreground"
              )}
            >
              {n}ª
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Repetições</label>
          <input
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="h-12 w-full rounded-xl border border-border px-3 text-center text-lg font-semibold"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Carga (kg)</label>
          <input
            type="number"
            step="0.5"
            value={carga}
            onChange={(e) => setCarga(e.target.value)}
            className="h-12 w-full rounded-xl border border-border px-3 text-center text-lg font-semibold"
          />
        </div>
      </div>

      {todasAsSeriesFeitas ? (
        <>
          <div className="flex items-center gap-2 rounded-2xl bg-success-soft px-4 py-3 text-sm font-semibold text-success">
            <CheckCircle2 size={18} />
            Exercício concluído!
          </div>
          <Link
            href={proximoHref}
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            {ehUltimoExercicio ? "Finalizar treino" : "Próximo exercício"}
            <ChevronRight size={18} />
          </Link>
        </>
      ) : (
        <>
          <Button onClick={finalizarSerie} disabled={pending} className="w-full">
            Finalizar série
          </Button>
          <Button onClick={finalizarTodas} disabled={pending} variant="outline" className="w-full">
            Finalizar todas as séries
          </Button>
        </>
      )}

      {/* Botão de relatar dor/desconforto — sempre visível na execução do exercício,
          não escondido atrás de menu (correção de design confirmada). */}
      <Link
        href={relatarDorHref}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
      >
        <HeartCrack size={18} />
        Relatar dor/desconforto
      </Link>
    </div>
  );
}
