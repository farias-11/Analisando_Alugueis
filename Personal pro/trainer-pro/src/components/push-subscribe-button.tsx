"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { removerSubscricaoPush } from "@/app/actions/push-subscription";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

type Estado = "indisponivel" | "negado" | "inativo" | "ativo" | "carregando";

export function PushSubscribeButton({
  salvarSubscricao,
}: {
  salvarSubscricao: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) => Promise<void>;
}) {
  const [estado, setEstado] = useState<Estado>("carregando");

  useEffect(() => {
    async function checar() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setEstado("indisponivel");
        return;
      }
      if (Notification.permission === "denied") {
        setEstado("negado");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const existente = await registration.pushManager.getSubscription();
      setEstado(existente ? "ativo" : "inativo");
    }
    checar();
  }, []);

  async function ativar() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      setEstado("indisponivel");
      return;
    }
    setEstado("carregando");
    const permissao = await Notification.requestPermission();
    if (permissao !== "granted") {
      setEstado(permissao === "denied" ? "negado" : "inativo");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const json = sub.toJSON();
    if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
      await salvarSubscricao({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
    }
    setEstado("ativo");
  }

  async function desativar() {
    setEstado("carregando");
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      await removerSubscricaoPush(sub.endpoint);
      await sub.unsubscribe();
    }
    setEstado("inativo");
  }

  if (estado === "carregando") return null;

  if (estado === "indisponivel") {
    return <p className="text-xs text-muted">Notificações push não estão disponíveis neste navegador.</p>;
  }

  if (estado === "negado") {
    return (
      <p className="flex items-center gap-2 text-xs text-muted">
        <BellOff size={14} />
        Bloqueadas no navegador — habilite nas permissões do site para ativar.
      </p>
    );
  }

  if (estado === "ativo") {
    return (
      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={desativar}>
        <BellRing size={14} className="text-primary" />
        Notificações push ativadas
      </Button>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={ativar}>
      <Bell size={14} />
      Ativar notificações push
    </Button>
  );
}
