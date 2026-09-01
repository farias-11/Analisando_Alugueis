"use client";

import Link from "next/link";
import { useTransition } from "react";
import { AlertTriangle, Bell, ShieldOff, Trash2, RefreshCw } from "lucide-react";
import { marcarNotificacaoLida } from "@/app/actions/notificacoes";
import { formatDataBR } from "@/lib/status";
import type { Notificacao } from "@/lib/types";

const ICONES: Record<string, typeof Bell> = {
  ticket_novo: AlertTriangle,
  consentimento_revogado: ShieldOff,
  exclusao_solicitada: Trash2,
  pedido_atualizacao: RefreshCw,
};

export function NotificationItem({ notificacao }: { notificacao: Notificacao }) {
  const [, startTransition] = useTransition();
  const Icone = ICONES[notificacao.tipo] ?? Bell;

  function marcarLida() {
    if (notificacao.lida) return;
    startTransition(() => {
      const fd = new FormData();
      fd.set("id", notificacao.id);
      marcarNotificacaoLida(fd);
    });
  }

  const conteudo = (
    <div
      className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${
        notificacao.lida ? "border-border bg-surface" : "border-primary/20 bg-primary-soft"
      }`}
    >
      <Icone size={18} className={notificacao.lida ? "mt-0.5 text-muted-2" : "mt-0.5 text-primary"} />
      <div className="flex-1">
        <p className="text-sm font-medium">{notificacao.titulo}</p>
        {notificacao.mensagem && <p className="text-sm text-muted">{notificacao.mensagem}</p>}
        <p className="mt-1 text-xs text-muted-2">{formatDataBR(notificacao.created_at)}</p>
      </div>
      {!notificacao.lida && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </div>
  );

  if (notificacao.link) {
    return (
      <Link href={notificacao.link} onClick={marcarLida}>
        {conteudo}
      </Link>
    );
  }

  return (
    <button type="button" onClick={marcarLida} className="block w-full text-left">
      {conteudo}
    </button>
  );
}
