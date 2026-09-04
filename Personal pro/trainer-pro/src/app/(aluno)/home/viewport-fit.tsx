"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// CSS vh/dvh/svh puro se mostrou pouco confiável no Safari real do iPhone
// (calcula como se a barra do navegador já estivesse escondida, mesmo
// visível — testado, não bastou nem trocar pra svh). Em vez de continuar
// perseguindo isso com CSS, mede a altura de verdade em JS
// (visualViewport, que é a API feita exatamente pra isso) e a altura real
// da nav inferior renderizada, e calcula tudo a partir desses números —
// sem depender de nenhuma unidade de viewport do navegador.
// "altura" (o state abaixo) já é o espaço disponível pro CONTEÚDO em si —
// medido depois de descontar a nav fixa e qualquer padding do layout ao
// redor (ver medir() abaixo). Os valores de referência aqui são portanto
// em espaço-de-conteúdo, não altura de tela: testado com tela de 667px
// (que sobra ~571px de conteúdo depois da nav) até tela de 900px (~804px
// de conteúdo).
const CONTEUDO_MIN = 571; // piso testado sem rolar (tela de 667px)
const REF_MIN = CONTEUDO_MIN;
const REF_MAX = 804; // tela de 900px — a partir daqui a escala trava no máximo

const TAMANHOS = {
  "--fs-tiny": [11, 13],
  "--fs-label": [14, 17],
  "--fs-num": [14, 19],
  "--fs-hero": [18, 25],
  "--fs-name": [20, 27],
  "--circle": [36, 48],
  "--pad-card": [11, 22],
  "--pad-inner": [8, 14],
  "--gap-card": [7, 16],
} as const;

function calcularVariaveis(alturaDisponivel: number): React.CSSProperties {
  const t = Math.min(1, Math.max(0, (alturaDisponivel - REF_MIN) / (REF_MAX - REF_MIN)));
  const vars: Record<string, string> = {};
  for (const [nome, [min, max]] of Object.entries(TAMANHOS)) {
    vars[nome] = `${Math.round(min + (max - min) * t)}px`;
  }
  return vars as React.CSSProperties;
}

export function ViewportFit({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // valor inicial = o piso (nunca estoura no primeiro paint, antes de medir de verdade)
  const [altura, setAltura] = useState(CONTEUDO_MIN);

  useEffect(() => {
    // tentativas > 0 = chamada de reconfirmação (ver abaixo) — evita
    // recursão infinita se por algum motivo nunca convergir.
    function medir(tentativas = 0) {
      const el = ref.current;
      if (!el) return;
      const viewportH = window.visualViewport?.height ?? window.innerHeight;

      // Passo 1: alvo geométrico otimista — "daqui até onde a nav fixa
      // começa" é o espaço que deveria existir. Sem isso, uma versão
      // anterior que só CORRIGIA excesso (nunca tentava crescer) ficava
      // presa no valor inicial pequeno pra sempre em telas altas, porque
      // "sem overflow" também é verdade quando o container está menor do
      // que precisaria.
      const meuTopo = el.getBoundingClientRect().top;
      const nav = document.querySelector("nav.safe-bottom");
      const navTopo = nav ? nav.getBoundingClientRect().top : viewportH;
      const alvo = Math.max(320, navTopo - meuTopo);

      // Passo 2: aplica o alvo de verdade NO DOM já (imperativo, não só via
      // state do React — que é assíncrono) pra medir scrollHeight refletindo
      // esse tamanho de verdade, e confere se isso estourou o documento por
      // algo que a conta geométrica não sabia (ex: pb-24 fixo do layout ao
      // redor, que fica DEPOIS da nav fixa no fluxo do documento e não
      // aparece na posição dela). Corrige subtraindo só o excesso de verdade.
      el.style.height = `${alvo}px`;
      const excesso = Math.max(0, document.documentElement.scrollHeight - viewportH);
      const disponivel = Math.max(320, alvo - excesso);
      el.style.height = `${disponivel}px`;
      setAltura(disponivel);

      // Passo 3: reconfirma um frame depois (com o valor corrigido já
      // aplicado de verdade no DOM, não o otimista) — cobre qualquer
      // diferença de timing (fonte carregando, Safari com a barra ainda
      // em transição no load inicial) sem arriscar uma chamada concorrente
      // desfazer a correção no meio do caminho. Só rechama medir() se ainda
      // sobrar excesso; limita a 3 voltas pra nunca girar pra sempre.
      if (tentativas < 3) {
        requestAnimationFrame(() => {
          const aindaExcesso = document.documentElement.scrollHeight - (window.visualViewport?.height ?? window.innerHeight);
          if (aindaExcesso > 1) medir(tentativas + 1);
        });
      }
    }

    medir();
    const onResize = () => medir();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // Sobra pequena e centralizada: a escala de fonte/padding mira só ~85%
  // do espaço medido (nunca menos que o piso seguro CONTEUDO_MIN) — isso
  // deixa o conteúdo naturalmente um pouco menor que o espaço todo. O bloco
  // em si NÃO tem altura forçada (fica "auto", do tamanho que o conteúdo
  // pede de verdade); é o outer com justify-center que centraliza essa
  // sobra em cima e embaixo. Importante: nunca encolhe o conteúdo abaixo do
  // que ele precisa pra não rolar — só o que sobra além disso vira margem.
  const alturaParaEscala = Math.max(altura * 0.85, CONTEUDO_MIN);
  const vars = calcularVariaveis(alturaParaEscala);

  return (
    <div ref={ref} style={{ height: `${altura}px` }} className="flex flex-col justify-center overflow-hidden">
      <div style={{ ...vars }} className="flex flex-col px-4">
        {children}
      </div>
    </div>
  );
}
