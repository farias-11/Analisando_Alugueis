"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

const DISMISSED_KEY = "trainer-pro-install-prompt-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPromptBanner() {
  const [visivel, setVisivel] = useState(false);
  const [plataforma, setPlataforma] = useState<"android" | "ios" | null>(null);
  const [eventoInstalacao, setEventoInstalacao] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      // localStorage indisponível (modo privado etc.) — trata como não dispensado
    }
    if (dismissed) return;

    const jaInstalado =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (jaInstalado) return;

    const ua = navigator.userAgent;
    const ehIOS = /iPhone|iPad|iPod/.test(ua);
    const ehAndroid = /Android/.test(ua);
    if (!ehIOS && !ehAndroid) return;

    queueMicrotask(() => {
      setPlataforma(ehIOS ? "ios" : "android");
      setVisivel(true);
    });

    function aoFicarInstalavel(e: Event) {
      e.preventDefault();
      setEventoInstalacao(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", aoFicarInstalavel);
    return () => window.removeEventListener("beforeinstallprompt", aoFicarInstalavel);
  }, []);

  function dispensar() {
    setVisivel(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // sem problema se não conseguir persistir — só volta a aparecer na próxima visita
    }
  }

  async function instalar() {
    if (!eventoInstalacao) return;
    await eventoInstalacao.prompt();
    dispensar();
  }

  if (!visivel) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 text-primary-dark">
      <div className="mt-0.5 shrink-0 rounded-lg bg-white p-1.5">
        {plataforma === "ios" ? <Share size={16} /> : <Download size={16} />}
      </div>
      <div className="flex-1 text-sm">
        <p className="font-semibold">Instale o Duo Flow no seu celular</p>
        {plataforma === "ios" ? (
          <p className="mt-0.5 text-xs">
            Toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.
          </p>
        ) : eventoInstalacao ? (
          <button onClick={instalar} className="mt-1.5 rounded-pill bg-primary px-3 py-1 text-xs font-semibold text-white">
            Instalar agora
          </button>
        ) : (
          <p className="mt-0.5 text-xs">
            Abra o menu do navegador (⋮) e toque em <strong>Adicionar à tela inicial</strong>.
          </p>
        )}
      </div>
      <button onClick={dispensar} className="shrink-0 text-primary-dark/60 hover:text-primary-dark">
        <X size={16} />
      </button>
    </div>
  );
}
