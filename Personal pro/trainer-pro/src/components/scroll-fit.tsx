"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Mesma técnica de medição da Home (ver (aluno)/home/viewport-fit.tsx pro
// histórico completo): visualViewport + altura real da nav inferior, nunca
// unidade de viewport do CSS (vh/dvh se mostraram inconsistentes no Safari
// real do iPhone). Diferença aqui: em vez de forçar TUDO a caber sem rolar
// (a Home tem sempre os mesmos 4 cards), listas de tamanho variável (treino
// de hoje pode ter 3 ou 12 exercícios) ganham uma altura medida e rolam POR
// DENTRO DE SI MESMAS — o resto da tela (TopBar, header, nav inferior) nunca
// sai do lugar, só a lista em si desliza quando não cabe tudo.
//
// Só a largura decide "modo desktop" aqui (sem a cláusula extra de paisagem
// curta que a Home usa) — essa cláusula existe lá por causa de um bug
// específico de vh/dvh no Safari em paisagem, mas aqui já testamos e ela
// disparava "falso positivo" em celular normal em pé, fazendo a tela cair
// no fluxo natural (sem altura forçada) e sobrar um vão em branco enorme.
const MEDIA_FLUXO_NATURAL = "(min-width: 768px)";

function varsDaEscala(escala: number) {
  return {
    "--sf-gap": `${Math.round(2 + (28 - 2) * escala)}px`,
    "--sf-pad": `${Math.round(6 + (32 - 6) * escala)}px`,
    // TETO de altura de mídia (vídeo/imagem do exercício), não o tamanho
    // em si — o vídeo usa aspect-video (16:9, proporcional à própria
    // largura, igual as telas já aprovadas) por padrão; esse var só entra
    // como max-height de segurança pras telas mais apertadas, onde nem o
    // piso de gap/pad é suficiente e aí sim precisa cortar um pouco a
    // altura do vídeo pra não estourar.
    "--sf-media-h": `${Math.round(100 + (500 - 100) * escala)}px`,
    // Mesmas faixas de --fs-name/--fs-tiny da Home (viewport-fit.tsx) —
    // título e rótulo aqui usam o MESMO padrão de crescimento, pra telas
    // altas "encherem" com tudo maior (texto incluso), não só mais respiro.
    // Só quem referenciar via className precisa disso — não afeta as telas
    // de execução, que não usam esses vars.
    "--sf-title": `${Math.round(20 + (32 - 20) * escala)}px`,
    "--sf-label": `${Math.round(11 + (14 - 11) * escala)}px`,
  };
}

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
  // 0..1 — quanto o espaçamento/padding (--sf-gap/--sf-pad) engorda além do
  // piso mais apertado, pra preencher sobra em telas altas em vez dela virar
  // vão vazio. Só afeta ESPAÇAMENTO, nunca o tamanho de um elemento
  // específico (ex: o vídeo, que é shrink-0 com altura fixa própria) — e
  // TODO filho do container tem shrink-0 (ver className embaixo), então
  // mesmo se a escala errar pra mais, o pior caso é uma sobra de alguns
  // poucos pixels, nunca um elemento sendo espremido a quase zero (bug já
  // visto aqui antes). A escala em si vem do estado autocorrigido em
  // medir() — não é derivada direto da altura medida, porque isso criava um
  // ciclo (escala maior → padding maior → conteúdo mais alto → precisava
  // medir de novo, mas nada remedia depois que os vars aplicavam).
  const [escala, setEscala] = useState(0);
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

  useLayoutEffect(() => {
    // Desktop/paisagem curta: nada de altura forçada, a página rola normal
    // (mesmo critério da Home — não existe BottomNav fixa pra medir contra).
    if (desktop) return;

    // tentativas > 0 = chamada de reconfirmação (ver abaixo) — evita
    // recursão infinita se por algum motivo nunca convergir.
    function medir(tentativas = 0, escalaAtual = rolar ? 0 : 1) {
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

      // Aplica os vars de escala IMPERATIVAMENTE, direto no DOM, antes de
      // medir — não espera o React re-renderizar (isso é assíncrono e
      // deixava a medição sempre um passo atrasada, um bug real já visto
      // aqui: nunca via o resultado da PRÓPRIA correção a tempo).
      if (!rolar) {
        const vars = varsDaEscala(escalaAtual);
        el.style.setProperty("--sf-gap", vars["--sf-gap"]);
        el.style.setProperty("--sf-pad", vars["--sf-pad"]);
        el.style.setProperty("--sf-media-h", vars["--sf-media-h"]);
      }

      // O excesso de página (ex: pb-24 do layout do aluno) precisa ser
      // descontado do alvo ANTES de checar se o conteúdo cabe — senão o
      // check passa com a altura maior (alvo), mas a altura de verdade
      // aplicada em seguida (disponivel, menor) nunca é reconferida, e um
      // caso que "passou" no alvo pode estourar de verdade na altura final
      // (bug real já visto aqui: escala aceita em alvo=530 com só 1px de
      // sobra, depois encolhida pra 509 sem reconferir, sobrando ~21px
      // cortados pelo overflow-hidden).
      const excesso = Math.max(0, document.documentElement.scrollHeight - viewportH);
      const disponivel = Math.max(160, alvo - excesso);
      el.style.height = `${disponivel}px`;

      const estourouDentroAgora = el.scrollHeight - el.clientHeight > 1;

      if (estourouDentroAgora && tentativas < 14) {
        // Essa escala não coube por dentro (overflow-hidden esconde isso do
        // documento — o scrollHeight do documento não mostra) — reduz e
        // remede antes de aceitar qualquer altura/escala como resultado.
        medir(tentativas + 1, Math.max(0, escalaAtual - 0.08));
        return;
      }

      setAltura(disponivel);
      setEscala(escalaAtual);

      // Reconfirma um frame depois — cobre timing (fonte carregando,
      // Safari com a barra em transição) sem arriscar uma chamada
      // concorrente desfazer a correção no meio do caminho.
      if (tentativas < 3) {
        requestAnimationFrame(() => {
          const aindaExcesso =
            document.documentElement.scrollHeight - (window.visualViewport?.height ?? window.innerHeight);
          if (aindaExcesso > 1) medir(tentativas + 1, escalaAtual);
        });
      }
    }

    // SÍNCRONO, dentro de useLayoutEffect — roda depois do DOM ser montado
    // mas ANTES do navegador pintar a tela. Sem isso (um useEffect comum, ou
    // qualquer await antes da 1ª medição), o navegador chegava a pintar o
    // estado "sem altura ainda" (fluxo natural, sem overflow-hidden nem
    // escala nenhuma aplicada) por um frame — e ISSO que aparecia como "a
    // tela abre grande e ajusta sozinha", principalmente em navegação
    // client-side (trocar de tela dentro do app, ex: entrar num exercício),
    // que já não tem o tempo de carregamento de página pra "esconder" esse
    // frame. Rodar medir() já aqui, síncrono, faz o PRIMEIRO frame pintado
    // já sair do tamanho certo.
    medir();

    // A fonte customizada pode ainda não ter carregado no instante do medir()
    // síncrono acima (raro fora do primeiro carregamento frio da página) —
    // reconfere assim que ela terminar de carregar. Em navegação client-side
    // (fonte já carregada há muito) isso não muda nada visível; só serve de
    // rede de segurança pro carregamento inicial.
    let cancelado = false;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelado) medir();
      });
    }

    // Reconfirma um pouco depois do mount — vídeo/iframe (YouTube, mídia
    // enviada) carrega de forma assíncrona e pode crescer DEPOIS da
    // primeira medição, sem disparar resize nenhum.
    const t1 = setTimeout(() => medir(), 350);
    const t2 = setTimeout(() => medir(), 1200);
    const onResize = () => medir();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      cancelado = true;
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [desktop, rolar]);

  const constrangido = !desktop && altura !== null;
  const varsEscala = varsDaEscala(escala) as React.CSSProperties;

  return (
    <div
      ref={ref}
      style={{
        ...(constrangido ? { height: `${altura}px` } : undefined),
        ...(!rolar ? varsEscala : undefined),
      }}
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
