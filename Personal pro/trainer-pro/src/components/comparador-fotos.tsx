"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatDataBR } from "@/lib/status";
import { ChevronLeft, ChevronRight, Download, MoveHorizontal, Loader2 } from "lucide-react";

export interface FotoComparavel {
  data: string;
  signedUrl: string | null;
}

const PRESETS = [
  { label: "Início", dias: null },
  { label: "1 mês", dias: 30 },
  { label: "3 meses", dias: 90 },
  { label: "6 meses", dias: 180 },
] as const;

function indiceMaisProximo(fotos: FotoComparavel[], dataAlvo: number) {
  let melhor = 0;
  let menorDiff = Infinity;
  fotos.forEach((f, i) => {
    const diff = Math.abs(new Date(f.data).getTime() - dataAlvo);
    if (diff < menorDiff) {
      menorDiff = diff;
      melhor = i;
    }
  });
  return melhor;
}

/** Comparador por ângulo — pro personal ver a evolução da mesma pose ao longo
 * do tempo, arrastando a divisória pra revelar o "antes" por baixo do "depois".
 * Tudo já vem carregado do servidor (poucas fotos por aluno), então trocar as
 * datas comparadas é só estado local, sem ida ao banco. */
export function ComparadorFotos({ porAngulo }: { porAngulo: Record<string, FotoComparavel[]> }) {
  const angulos = useMemo(() => Object.keys(porAngulo).filter((a) => porAngulo[a].length > 0), [porAngulo]);
  const [anguloAtivo, setAnguloAtivo] = useState(angulos[0]);
  const fotos = porAngulo[anguloAtivo] ?? [];

  const [indiceAntes, setIndiceAntes] = useState(0);
  const [indiceDepois, setIndiceDepois] = useState(fotos.length - 1);
  const [baixando, setBaixando] = useState(false);

  function trocarAngulo(angulo: string) {
    setAnguloAtivo(angulo);
    const novasFotos = porAngulo[angulo] ?? [];
    setIndiceAntes(0);
    setIndiceDepois(novasFotos.length - 1);
  }

  if (angulos.length === 0) return null;

  const antes = fotos[indiceAntes];
  const depois = fotos[indiceDepois];
  const diffDias =
    antes && depois
      ? Math.round((new Date(depois.data).getTime() - new Date(antes.data).getTime()) / 86_400_000)
      : null;

  // só mostra presets que cabem no período de fotos que a gente realmente tem
  const spanDias =
    fotos.length >= 2
      ? Math.round((new Date(fotos[fotos.length - 1].data).getTime() - new Date(fotos[0].data).getTime()) / 86_400_000)
      : 0;
  const presetsDisponiveis = PRESETS.filter((p) => p.dias === null || p.dias <= spanDias);

  function aplicarPreset(dias: number | null) {
    if (fotos.length < 2) return;
    const ultimo = fotos[fotos.length - 1];
    setIndiceDepois(fotos.length - 1);
    if (dias === null) {
      setIndiceAntes(0);
      return;
    }
    const alvo = new Date(ultimo.data).getTime() - dias * 86_400_000;
    setIndiceAntes(indiceMaisProximo(fotos, alvo));
  }

  async function baixarComparacao() {
    if (!antes.signedUrl || !depois.signedUrl) return;
    setBaixando(true);
    try {
      await gerarImagemComparacao({ antes, depois, angulo: anguloAtivo });
    } catch {
      // silencioso — se falhar (ex: rede), o personal só tenta de novo
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div>
      {angulos.length > 1 && (
        <div className="mb-3 flex gap-2 overflow-x-auto">
          {angulos.map((angulo) => (
            <button
              key={angulo}
              onClick={() => trocarAngulo(angulo)}
              className={`shrink-0 rounded-pill border px-3 py-1.5 text-xs font-medium ${
                angulo === anguloAtivo
                  ? "border-primary bg-primary-soft text-primary-dark"
                  : "border-border text-muted"
              }`}
            >
              {angulo}
            </button>
          ))}
        </div>
      )}

      {fotos.length < 2 ? (
        <p className="text-sm text-muted">
          Só tem uma foto de &quot;{anguloAtivo}&quot; até agora — quando o aluno enviar outra, dá pra comparar aqui.
        </p>
      ) : (
        <>
          {presetsDisponiveis.length > 1 && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto">
              {presetsDisponiveis.map((p) => (
                <button
                  key={p.label}
                  onClick={() => aplicarPreset(p.dias)}
                  className="shrink-0 rounded-pill bg-neutral-soft px-2.5 py-1 text-[11px] font-medium text-muted hover:bg-primary-soft hover:text-primary-dark"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <SliderAntesDepois antes={antes} depois={depois} />

          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => setIndiceAntes((i) => i - 1)}
              disabled={indiceAntes === 0}
              className="flex items-center gap-1 rounded-pill border border-border px-2.5 py-1 text-xs font-medium text-muted disabled:opacity-30"
            >
              <ChevronLeft size={13} /> Antes: {formatDataBR(antes.data)}
            </button>
            <button
              onClick={() => setIndiceDepois((i) => i + 1)}
              disabled={indiceDepois === fotos.length - 1}
              className="flex items-center gap-1 rounded-pill border border-border px-2.5 py-1 text-xs font-medium text-muted disabled:opacity-30"
            >
              Depois: {formatDataBR(depois.data)} <ChevronRight size={13} />
            </button>
          </div>
          {diffDias !== null && (
            <p className="mt-2 text-center text-xs text-muted">
              {diffDias === 0 ? "Mesmo dia" : `${diffDias} dia${diffDias === 1 ? "" : "s"} de diferença`}
            </p>
          )}

          <button
            onClick={baixarComparacao}
            disabled={baixando}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-sm font-medium text-foreground disabled:opacity-50"
          >
            {baixando ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            {baixando ? "Gerando imagem..." : "Baixar comparação"}
          </button>
        </>
      )}
    </div>
  );
}

function SliderAntesDepois({ antes, depois }: { antes: FotoComparavel; depois: FotoComparavel }) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const arrastandoRef = useRef(false);

  const atualizarPos = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!arrastandoRef.current) return;
      atualizarPos(e.clientX);
    }
    function onUp() {
      arrastandoRef.current = false;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [atualizarPos]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto aspect-[3/4] w-full max-w-[260px] touch-none select-none overflow-hidden rounded-xl bg-neutral-soft"
      onPointerDown={(e) => {
        arrastandoRef.current = true;
        atualizarPos(e.clientX);
      }}
    >
      {depois.signedUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={depois.signedUrl}
          alt="Depois"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {antes.signedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={antes.signedUrl}
            alt="Antes"
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>

      <span className="absolute left-1.5 top-1.5 rounded-pill bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
        Antes
      </span>
      <span className="absolute right-1.5 top-1.5 rounded-pill bg-black/50 px-2 py-0.5 text-[10px] font-medium text-white">
        Depois
      </span>

      <div className="absolute inset-y-0 w-0.5 bg-white/90 shadow" style={{ left: `${pos}%` }}>
        <div className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg">
          <MoveHorizontal size={14} />
        </div>
      </div>
    </div>
  );
}

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return fetch(url)
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const objUrl = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            resolve(img);
            URL.revokeObjectURL(objUrl);
          };
          img.onerror = reject;
          img.src = objUrl;
        })
    );
}

/** Monta uma imagem única lado a lado (antes | depois) com legendas, pro
 * personal baixar e mandar pro aluno como feedback — diferente do slider,
 * que é só pra visualizar na tela. */
async function gerarImagemComparacao({
  antes,
  depois,
  angulo,
}: {
  antes: FotoComparavel;
  depois: FotoComparavel;
  angulo: string;
}) {
  if (!antes.signedUrl || !depois.signedUrl) return;
  const [imgAntes, imgDepois] = await Promise.all([carregarImagem(antes.signedUrl), carregarImagem(depois.signedUrl)]);

  const larguraMetade = 600;
  const altura = 800;
  const faixaTopo = 56;
  const canvas = document.createElement("canvas");
  canvas.width = larguraMetade * 2;
  canvas.height = altura + faixaTopo;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = "bold 26px system-ui, sans-serif";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText(angulo, canvas.width / 2, 38);

  desenharMetade(ctx, imgAntes, 0, faixaTopo, larguraMetade, altura, "Antes", antes.data);
  desenharMetade(ctx, imgDepois, larguraMetade, faixaTopo, larguraMetade, altura, "Depois", depois.data);

  ctx.strokeStyle = "#18181b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(larguraMetade, faixaTopo);
  ctx.lineTo(larguraMetade, faixaTopo + altura);
  ctx.stroke();

  const url = canvas.toDataURL("image/jpeg", 0.92);
  const a = document.createElement("a");
  a.href = url;
  a.download = `comparacao-${angulo.toLowerCase().replace(/\s+/g, "-")}-${antes.data}-a-${depois.data}.jpg`;
  a.click();
}

function desenharMetade(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  rotulo: string,
  data: string
) {
  // object-cover manual: recorta o excesso da imagem original mantendo o centro
  const escala = Math.max(w / img.width, h / img.height);
  const sw = w / escala;
  const sh = h / escala;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);

  const gradiente = ctx.createLinearGradient(0, y + h - 90, 0, y + h);
  gradiente.addColorStop(0, "rgba(0,0,0,0)");
  gradiente.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = gradiente;
  ctx.fillRect(x, y + h - 90, w, 90);

  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.font = "bold 22px system-ui, sans-serif";
  ctx.fillText(rotulo, x + 16, y + h - 42);
  ctx.font = "16px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(formatDataBR(data), x + 16, y + h - 18);
}
