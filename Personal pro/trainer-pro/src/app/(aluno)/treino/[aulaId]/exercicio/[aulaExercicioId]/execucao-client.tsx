"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registrarSerie, registrarTodasAsSeries } from "@/app/actions/execucoes";
import { enfileirarExecucao, obterFila } from "@/lib/offline-queue";
import { Button } from "@/components/ui/button";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";
import { CheckCircle2, ChevronRight, Flame, HeartCrack, Link2, WifiOff, X } from "lucide-react";
import type { AulaExercicio, Aula, Exercicio, ExercicioMidia } from "@/lib/types";

type Registro = AulaExercicio & { exercicio: Exercicio & { midias: ExercicioMidia[] }; aula: Aula };
type ValorSerie = { carga: number | null; repeticoes: number | null };

const TABS = ["Geral", "Instruções", "Alvo", "Carga Máx."] as const;

function formatarTempo(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function TimerDescanso({ duracaoSeg, onFim }: { duracaoSeg: number; onFim: () => void }) {
  const [restante, setRestante] = useState(duracaoSeg);

  useEffect(() => {
    if (restante <= 0) {
      onFim();
      return;
    }
    const id = setTimeout(() => setRestante((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restante]);

  const progresso = 1 - restante / duracaoSeg;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-black/80 px-6 text-center backdrop-blur-sm">
      <button onClick={onFim} className="absolute right-5 top-6 text-white/70 hover:text-white">
        <X size={26} />
      </button>
      <p className="text-sm font-medium uppercase tracking-wide text-white/70">Descanso</p>
      <div className="relative flex h-48 w-48 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 45}
            strokeDashoffset={2 * Math.PI * 45 * (1 - progresso)}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <span className="text-5xl font-bold text-white">{formatarTempo(restante)}</span>
      </div>
      <Button onClick={onFim} variant="secondary" className="w-full max-w-xs bg-white text-primary-dark hover:bg-white/90">
        Finalizar descanso
      </Button>
    </div>
  );
}

function MarcaMaxima({ marca }: { marca: { carga: number | null; repeticoes: number | null } | null | undefined }) {
  if (!marca?.carga && !marca?.repeticoes) return null;
  return (
    <span className="shrink-0 rounded-pill border border-danger/40 bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
      Máx.: {marca.carga ?? "—"}kg x {marca.repeticoes ?? "—"} reps
    </span>
  );
}

export function ExecucaoClient({
  aulaId,
  aulaExercicio,
  ultimaMarca,
  execucoesDeHoje,
  proximoExercicioId,
  ehUltimoExercicio,
  parceiro,
  ultimaMarcaParceiro,
  execucoesDeHojeParceiro,
}: {
  aulaId: string;
  aulaExercicio: Registro;
  ultimaMarca: { carga: number | null; repeticoes: number | null } | null;
  execucoesDeHoje: Record<number, ValorSerie>;
  proximoExercicioId: string | null;
  ehUltimoExercicio: boolean;
  parceiro?: Registro | null;
  ultimaMarcaParceiro?: { carga: number | null; repeticoes: number | null } | null;
  execucoesDeHojeParceiro?: Record<number, ValorSerie>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Geral");
  const [valoresPorSerie, setValoresPorSerie] = useState<Record<number, ValorSerie>>(execucoesDeHoje);
  const [valoresPorSerieParceiro, setValoresPorSerieParceiro] = useState<Record<number, ValorSerie>>(
    execucoesDeHojeParceiro ?? {}
  );
  // num bi-set, uma série só conta como feita quando os dois lados têm valor
  const seriesFeitas = useMemo(() => {
    const nums = Object.keys(valoresPorSerie).map(Number).filter((n) => n <= aulaExercicio.series);
    return parceiro ? nums.filter((n) => valoresPorSerieParceiro[n]) : nums;
  }, [valoresPorSerie, valoresPorSerieParceiro, aulaExercicio.series, parceiro]);
  const primeiraPendente = useMemo(() => {
    for (let i = 1; i <= aulaExercicio.series; i++) {
      if (!valoresPorSerie[i] || (parceiro && !valoresPorSerieParceiro[i])) return i;
    }
    return aulaExercicio.series;
  }, [valoresPorSerie, valoresPorSerieParceiro, aulaExercicio.series, parceiro]);

  const [serieAtual, setSerieAtual] = useState(primeiraPendente);
  const valorAtual = valoresPorSerie[serieAtual];
  const valorAtualParceiro = valoresPorSerieParceiro[serieAtual];
  const [reps, setReps] = useState(String(valorAtual?.repeticoes ?? aulaExercicio.repeticoes.split("-")[0] ?? ""));
  const [carga, setCarga] = useState(String(valorAtual?.carga ?? aulaExercicio.carga_inicial ?? ""));
  const [repsParceiro, setRepsParceiro] = useState(
    String(valorAtualParceiro?.repeticoes ?? parceiro?.repeticoes.split("-")[0] ?? "")
  );
  const [cargaParceiro, setCargaParceiro] = useState(String(valorAtualParceiro?.carga ?? parceiro?.carga_inicial ?? ""));
  const [pending, startTransition] = useTransition();
  const [descansoAberto, setDescansoAberto] = useState(false);
  const [pendentesOffline, setPendentesOffline] = useState(0);

  useEffect(() => {
    async function checar() {
      await Promise.resolve();
      setPendentesOffline(obterFila().length);
    }
    checar();
  }, []);

  function irParaSerie(n: number, valores: Record<number, ValorSerie>, valoresParceiro?: Record<number, ValorSerie>) {
    setSerieAtual(n);
    const v = valores[n];
    setReps(String(v?.repeticoes ?? aulaExercicio.repeticoes.split("-")[0] ?? ""));
    setCarga(String(v?.carga ?? aulaExercicio.carga_inicial ?? ""));
    if (parceiro) {
      const vp = (valoresParceiro ?? valoresPorSerieParceiro)[n];
      setRepsParceiro(String(vp?.repeticoes ?? parceiro.repeticoes.split("-")[0] ?? ""));
      setCargaParceiro(String(vp?.carga ?? parceiro.carga_inicial ?? ""));
    }
  }

  const embedUrl = useMemo(
    () => youtubeEmbedUrl(aulaExercicio.exercicio.youtube_url),
    [aulaExercicio.exercicio.youtube_url]
  );
  const primeiraMidiaUpload = aulaExercicio.exercicio.midias?.[0];

  function salvarSerie() {
    const cargaNum = carga ? Number(carga) : null;
    const repsNum = reps ? Number(reps) : null;
    const cargaNumParceiro = parceiro ? (cargaParceiro ? Number(cargaParceiro) : null) : null;
    const repsNumParceiro = parceiro ? (repsParceiro ? Number(repsParceiro) : null) : null;
    const serieSalva = serieAtual;
    startTransition(async () => {
      try {
        if (!navigator.onLine) throw new Error("offline");
        await registrarSerie({
          aulaExercicioId: aulaExercicio.id,
          aulaId,
          serieNumero: serieSalva,
          carga: cargaNum,
          repeticoes: repsNum,
        });
        if (parceiro) {
          await registrarSerie({
            aulaExercicioId: parceiro.id,
            aulaId,
            serieNumero: serieSalva,
            carga: cargaNumParceiro,
            repeticoes: repsNumParceiro,
          });
        }
        router.refresh();
      } catch {
        enfileirarExecucao({
          aulaExercicioId: aulaExercicio.id,
          aulaId,
          serieNumero: serieSalva,
          carga: cargaNum,
          repeticoes: repsNum,
        });
        if (parceiro) {
          enfileirarExecucao({
            aulaExercicioId: parceiro.id,
            aulaId,
            serieNumero: serieSalva,
            carga: cargaNumParceiro,
            repeticoes: repsNumParceiro,
          });
        }
        setPendentesOffline(obterFila().length);
      }
      const novosValores = { ...valoresPorSerie, [serieSalva]: { carga: cargaNum, repeticoes: repsNum } };
      setValoresPorSerie(novosValores);
      let novosValoresParceiro = valoresPorSerieParceiro;
      if (parceiro) {
        novosValoresParceiro = { ...valoresPorSerieParceiro, [serieSalva]: { carga: cargaNumParceiro, repeticoes: repsNumParceiro } };
        setValoresPorSerieParceiro(novosValoresParceiro);
      }
      if (serieSalva < aulaExercicio.series) irParaSerie(serieSalva + 1, novosValores, novosValoresParceiro);
      // cardio não tem "próxima série" pra descansar antes — não faz sentido
      // mostrar o cronômetro de descanso ao concluir
      if (aulaExercicio.tipo !== "cardio") setDescansoAberto(true);
    });
  }

  function finalizarTodas() {
    const cargaNum = carga ? Number(carga) : null;
    const repsNum = reps ? Number(reps) : null;
    const cargaNumParceiro = parceiro ? (cargaParceiro ? Number(cargaParceiro) : null) : null;
    const repsNumParceiro = parceiro ? (repsParceiro ? Number(repsParceiro) : null) : null;
    startTransition(async () => {
      try {
        if (!navigator.onLine) throw new Error("offline");
        await registrarTodasAsSeries({
          aulaExercicioId: aulaExercicio.id,
          aulaId,
          totalSeries: aulaExercicio.series,
          carga: cargaNum,
          repeticoes: repsNum,
        });
        if (parceiro) {
          await registrarTodasAsSeries({
            aulaExercicioId: parceiro.id,
            aulaId,
            totalSeries: aulaExercicio.series,
            carga: cargaNumParceiro,
            repeticoes: repsNumParceiro,
          });
        }
        router.refresh();
      } catch {
        enfileirarExecucao({
          aulaExercicioId: aulaExercicio.id,
          aulaId,
          serieNumero: 1,
          carga: cargaNum,
          repeticoes: repsNum,
          todasAsSeries: { totalSeries: aulaExercicio.series },
        });
        if (parceiro) {
          enfileirarExecucao({
            aulaExercicioId: parceiro.id,
            aulaId,
            serieNumero: 1,
            carga: cargaNumParceiro,
            repeticoes: repsNumParceiro,
            todasAsSeries: { totalSeries: aulaExercicio.series },
          });
        }
        setPendentesOffline(obterFila().length);
      }
      const todas: Record<number, ValorSerie> = {};
      for (let i = 1; i <= aulaExercicio.series; i++) todas[i] = { carga: cargaNum, repeticoes: repsNum };
      setValoresPorSerie(todas);
      if (parceiro) {
        const todasParceiro: Record<number, ValorSerie> = {};
        for (let i = 1; i <= aulaExercicio.series; i++) todasParceiro[i] = { carga: cargaNumParceiro, repeticoes: repsNumParceiro };
        setValoresPorSerieParceiro(todasParceiro);
      }
      setDescansoAberto(true);
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
      {descansoAberto && (
        <TimerDescanso duracaoSeg={aulaExercicio.descanso_seg ?? 60} onFim={() => setDescansoAberto(false)} />
      )}

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

      {parceiro && (
        <div className="flex items-center gap-1.5 rounded-xl bg-primary-soft px-3.5 py-2.5 text-sm font-medium text-primary-dark">
          <Link2 size={16} /> Bi-set com {parceiro.exercicio.nome} — faça os dois sem descanso entre eles, depois
          descanse.
        </div>
      )}

      {pendentesOffline > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm text-warning">
          <WifiOff size={16} />
          {pendentesOffline} registro{pendentesOffline > 1 ? "s" : ""} salvo{pendentesOffline > 1 ? "s" : ""} no
          aparelho, aguardando internet pra sincronizar.
        </div>
      )}

      {aulaExercicio.eh_aquecimento && (
        <div className="flex items-center gap-1.5 rounded-xl bg-warning-soft px-3.5 py-2.5 text-sm font-medium text-warning">
          <Flame size={16} /> Série de aquecimento — use uma carga mais leve antes das séries valendo.
        </div>
      )}


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
            {aulaExercicio.tipo === "cardio"
              ? `${aulaExercicio.duracao_min ?? "—"} minutos${aulaExercicio.intensidade ? ` · intensidade ${aulaExercicio.intensidade}` : ""}`
              : `${aulaExercicio.series} séries de ${aulaExercicio.repeticoes} · descanso ${aulaExercicio.descanso_seg ?? 60}s`}
          </p>
        )}
        {tab === "Instruções" && (
          <p>{aulaExercicio.exercicio.instrucoes || "Sem instruções cadastradas."}</p>
        )}
        {tab === "Alvo" && (
          <p>
            {aulaExercicio.tipo === "cardio"
              ? `${aulaExercicio.duracao_min ?? "—"} minutos de cardio.`
              : `${aulaExercicio.repeticoes} repetições alvo por série.`}
          </p>
        )}
        {tab === "Carga Máx." && (
          <p>{ultimaMarca?.carga ? `${ultimaMarca.carga}kg` : "Ainda sem registro."}</p>
        )}
      </div>

      {aulaExercicio.tipo === "cardio" ? (
        <>
          <Button onClick={salvarSerie} disabled={pending || todasAsSeriesFeitas} className="w-full">
            {todasAsSeriesFeitas ? "Concluído ✓" : "Concluir exercício"}
          </Button>
          {todasAsSeriesFeitas && (
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
          )}
          <Link
            href={relatarDorHref}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
          >
            <HeartCrack size={18} />
            Relatar dor/desconforto
          </Link>
        </>
      ) : (
        <>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Série {todasAsSeriesFeitas ? "· toque para editar uma série já feita" : ""}
            </p>
            <div className="flex gap-2">
              {Array.from({ length: aulaExercicio.series }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => irParaSerie(n, valoresPorSerie)}
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

          <p className="flex items-center justify-between gap-2 text-xs font-semibold text-foreground">
            {aulaExercicio.exercicio.nome}
            <MarcaMaxima marca={ultimaMarca} />
          </p>
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

          {parceiro && (
            <>
              <p className="flex items-center justify-between gap-2 text-xs font-semibold text-foreground">
                {parceiro.exercicio.nome}
                <MarcaMaxima marca={ultimaMarcaParceiro} />
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Repetições</label>
                  <input
                    type="number"
                    value={repsParceiro}
                    onChange={(e) => setRepsParceiro(e.target.value)}
                    className="h-12 w-full rounded-xl border border-border px-3 text-center text-lg font-semibold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted">Carga (kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={cargaParceiro}
                    onChange={(e) => setCargaParceiro(e.target.value)}
                    className="h-12 w-full rounded-xl border border-border px-3 text-center text-lg font-semibold"
                  />
                </div>
              </div>
            </>
          )}

          <Button onClick={salvarSerie} disabled={pending} className="w-full">
            {seriesFeitas.includes(serieAtual)
              ? "Salvar alteração nesta série"
              : parceiro
                ? "Finalizar série dos dois"
                : "Finalizar série"}
          </Button>

          {!todasAsSeriesFeitas && (
            <Button onClick={finalizarTodas} disabled={pending} variant="outline" className="w-full">
              Finalizar todas as séries
            </Button>
          )}

          {todasAsSeriesFeitas && (
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
        </>
      )}
    </div>
  );
}
