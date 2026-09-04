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

// Tiers MÁXIMOS bem mais generosos que antes — em telas altas, sem nenhum
// card esticando sozinho (page.tsx, todos shrink-0), é ISSO que precisa
// preencher o espaço: tudo (fonte, padding, círculo, respiro entre cards)
// visivelmente maior, não só um pouquinho. Testado até altura medida
// ~835px (tela de ~930px) sem sobrar vão vazio em cima/embaixo.
const TAMANHOS = {
  "--fs-tiny": [11, 14],
  "--fs-label": [14, 19],
  "--fs-num": [14, 22],
  "--fs-hero": [18, 29],
  "--fs-name": [20, 32],
  "--circle": [36, 58],
  "--pad-card": [9, 34],
  "--pad-inner": [7, 20],
  "--gap-card": [6, 26],
} as const;

function calcularVariaveis(alturaDisponivel: number): React.CSSProperties {
  const t = Math.min(1, Math.max(0, (alturaDisponivel - REF_MIN) / (REF_MAX - REF_MIN)));
  const vars: Record<string, string> = {};
  for (const [nome, [min, max]] of Object.entries(TAMANHOS)) {
    vars[nome] = `${Math.round(min + (max - min) * t)}px`;
  }
  return vars as React.CSSProperties;
}

// Duas situações em que o encaixe "sem rolar" (pensado pra tela de celular
// em pé) não faz sentido e vira PIOR que rolagem normal:
// 1) >= md (768px) do Tailwind — mesmo breakpoint em que a BottomNav vira
//    md:hidden e o Sidebar (desktop) assume a navegação (ver (aluno)/layout.tsx).
// 2) celular deitado (paisagem) com pouca altura — o chão de CONTEUDO_MIN
//    (calibrado pensando em altura de tela em pé) não cabe numa tela de
//    ~375-430px de altura deitada, cortando conteúdo. Nesses dois casos
//    a página rola normal, como qualquer página comum.
const MEDIA_FLUXO_NATURAL = "(min-width: 768px), (orientation: landscape) and (max-height: 500px)";

export function ViewportFit({ header, children }: { header?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // valor inicial = o piso (nunca estoura no primeiro paint, antes de medir de verdade)
  const [altura, setAltura] = useState(CONTEUDO_MIN);
  // Sempre começa "false" (igual ao HTML renderizado no servidor, que não
  // tem window pra checar matchMedia) — senão o primeiro render no cliente
  // já sai diferente do HTML do servidor e o React descarta tudo com um
  // erro de hydration mismatch. O valor de verdade só chega depois do
  // mount, via effect — um re-render a mais aqui é esperado e necessário
  // pra esse tipo de checagem client-only, não dá pra evitar com
  // inicializador preguiçoso sem quebrar a hydration.
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MEDIA_FLUXO_NATURAL);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- de propósito: ver comentário acima do useState(desktop)
    setDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // No desktop não existe BottomNav fixa pra medir contra (ela some via
    // md:hidden) e nem precisa desse encaixe sem-rolagem — é só a home de
    // um app mobile, no PC a página pode rolar normal como qualquer outra.
    // Sem esse corte cedo, medir() achava a nav "no topo" (getBoundingClientRect
    // de elemento hidden = tudo zero) e forçava uma altura minúscula,
    // cortando o conteúdo pela metade.
    if (desktop) return;

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
  }, [desktop]);

  // Fonte/padding escalam quase até 100% do espaço medido (nunca menos que
  // o piso seguro CONTEUDO_MIN) — é assim que a tela "preenche": tudo cresce
  // JUNTO e proporcionalmente (texto, círculos, respiro dos cards), não um
  // card específico. NENHUM card estica sozinho pra preencher sobra (ver
  // page.tsx — todos são shrink-0): já testado que isso vira "card gigante,
  // conteúdo minúsculo" em telas com espaço sobrando, porque a sobra nunca
  // se distribui de forma proporcional ao conteúdo de cada card. E também
  // já testado que reservar uma fatia fixa (~15%) da tela pra escala de
  // fonte deixa sobra demais como margem vazia em cima/embaixo em telas
  // altas — por isso quase 100%, não 85%. O bloco inteiro fica centralizado
  // no espaço disponível; o que sobrar (pouco, agora) vira margem simétrica.
  const alturaParaEscala = Math.max(altura * 0.98, CONTEUDO_MIN);
  const vars = calcularVariaveis(alturaParaEscala);

  // Desktop: nada de altura forçada nem overflow-hidden — a página rola
  // normal, como qualquer página comum (largura máxima e respiro ficam por
  // conta do <main> do (aluno)/layout.tsx, igual toda outra página do
  // aluno). Usa o tier MÁXIMO de fonte/padding já calibrado
  // (calcularVariaveis(REF_MAX), o mesmo de uma tela "grande" no encaixe
  // mobile), fixo, sem depender de nenhuma medição.
  if (desktop) {
    const varsDesktop = calcularVariaveis(REF_MAX);
    return (
      <div style={{ ...varsDesktop }} className="flex min-h-[calc(100dvh-8rem)] flex-col justify-center">
        {header && <div className="mb-6">{header}</div>}
        <div className="flex flex-col">{children}</div>
      </div>
    );
  }

  // header (se houver) fica PINADO no topo, com o mesmo pt-3.5/px-4 do sino
  // de notificação (renderizado pelo layout, ver (aluno)/layout.tsx) — assim
  // as duas coisas ficam sempre na mesma altura, independente de quanta
  // sobra existe. O resto do conteúdo (tamanho natural) fica centralizado no
  // espaço que sobra abaixo do header (ver comentário acima).
  return (
    <div ref={ref} style={{ height: `${altura}px` }} className="flex flex-col overflow-hidden">
      {header && (
        <div style={{ ...vars, paddingBottom: "var(--gap-card)" }} className="shrink-0 px-4 pt-3.5">
          {header}
        </div>
      )}
      <div className="flex flex-1 flex-col justify-center overflow-hidden">
        <div style={{ ...vars }} className="flex flex-col px-4">
          {children}
        </div>
      </div>
    </div>
  );
}
