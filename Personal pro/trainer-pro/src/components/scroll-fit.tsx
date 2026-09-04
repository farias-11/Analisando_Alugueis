"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Mesma técnica de medição da Home (ver (aluno)/home/viewport-fit.tsx pro
// histórico completo): visualViewport + altura real da nav inferior, nunca
// unidade de viewport do CSS (vh/dvh se mostraram inconsistentes no Safari
// real do iPhone). Diferença aqui: em vez de forçar TUDO a caber sem rolar
// (a Home tem sempre os mesmos 4 cards), listas de tamanho variável (treino
// de hoje pode ter 3 ou 12 exercícios) ganham uma altura medida e rolam POR
// DENTRO DE SI MESMAS — o resto da tela (TopBar, header, nav inferior) nunca
// sai do lugar, só a lista em si desliza quando não cabe tudo.
const MEDIA_FLUXO_NATURAL = "(min-width: 768px), (orientation: landscape) and (max-height: 500px)";

export function ScrollFit({
  children,
  className,
  rolar = true,
  topo = false,
}: {
  children: ReactNode;
  className?: string;
  /** true (padrão): conteúdo maior que o espaço rola por dentro da região
   * (lista de exercícios, que pode ter qualquer tamanho). false: o
   * conteúdo NUNCA rola, nem por dentro — usado nas telas com conteúdo
   * previsível (lista da semana, execução do exercício, finalização),
   * onde a orientação é caber tudo sempre, sem exceção. */
  rolar?: boolean;
  /** só com rolar=false: por padrão o conteúdo fica centralizado na sobra
   * (bom pra um bloco único, tipo a tela de execução do exercício). topo=true
   * ancora no topo em vez de centralizar — pra quando este é o restante de
   * uma tela que já tem algo fixo logo acima (ex: a lista "Esta semana" vem
   * logo abaixo do card de hoje — centralizar a lista sozinha a afastava do
   * card, sobra vira espaço embaixo, perto da nav, não entre os dois). */
  topo?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [altura, setAltura] = useState<number | null>(null);
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    // Sempre começa "false" (igual ao HTML do servidor, que não tem window
    // pra checar matchMedia) — senão o primeiro render no cliente já sai
    // diferente do HTML do servidor e vira erro de hydration mismatch. Ver
    // mesmo padrão em (aluno)/home/viewport-fit.tsx.
    const mq = window.matchMedia(MEDIA_FLUXO_NATURAL);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- de propósito, ver comentário acima
    setDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    // Desktop/paisagem curta: nada de altura forçada, a página rola normal
    // (mesmo critério da Home — não existe BottomNav fixa pra medir contra).
    if (desktop) return;

    function medir() {
      const el = ref.current;
      if (!el) return;
      const viewportH = window.visualViewport?.height ?? window.innerHeight;
      const meuTopo = el.getBoundingClientRect().top;
      const nav = document.querySelector("nav.safe-bottom");
      const navTopo = nav ? nav.getBoundingClientRect().top : viewportH;
      const alvo = Math.max(160, navTopo - meuTopo - 12);

      // Aplica o alvo geométrico de verdade no DOM (imperativo, não só via
      // state) pra medir se isso ainda estoura o documento por algo que essa
      // conta não sabia — ex: o pb-24 do layout do aluno, reservado pra
      // páginas comuns (sem ScrollFit) não ficarem escondidas atrás da nav
      // fixa, mas que essa página não precisa (já reserva o próprio espaço
      // aqui). Mesma técnica de autocorreção da Home, ver
      // (aluno)/home/viewport-fit.tsx pro histórico completo.
      el.style.height = `${alvo}px`;
      const excesso = Math.max(0, document.documentElement.scrollHeight - viewportH);
      setAltura(Math.max(160, alvo - excesso));
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

  const constrangido = !desktop && altura !== null;

  return (
    <div
      ref={ref}
      style={constrangido ? { height: `${altura}px` } : undefined}
      className={cn(
        constrangido &&
          (rolar
            ? "overflow-y-auto overscroll-contain"
            : `flex flex-col overflow-hidden ${topo ? "justify-start" : "justify-center"}`),
        className
      )}
    >
      {children}
    </div>
  );
}
