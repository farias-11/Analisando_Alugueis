"use client";

import { useActionState, useEffect } from "react";
import { gerarLinkConviteWhatsapp } from "@/app/actions/alunos";
import { Button } from "@/components/ui/button";
import { buildWhatsappLink, mensagemConvite } from "@/lib/whatsapp";
import { MessageCircle } from "lucide-react";

/** Botão de convite via WhatsApp (canal principal, handoff seção 4): gera um
 * link de convite novo e abre o WhatsApp já com a mensagem pronta — sem
 * passar pelo e-mail automático do Supabase. */
export function ConviteWhatsappButton({
  alunoId,
  alunoNome,
  personalNome,
  whatsapp,
}: {
  alunoId: string;
  alunoNome: string;
  personalNome: string;
  whatsapp: string | null;
}) {
  const [state, formAction, pending] = useActionState(gerarLinkConviteWhatsapp, undefined);

  useEffect(() => {
    if (state && "conviteLink" in state && whatsapp) {
      const url = buildWhatsappLink(whatsapp, mensagemConvite({ alunoNome, personalNome, link: state.conviteLink }));
      window.open(url, "_blank");
    }
  }, [state, whatsapp, alunoNome, personalNome]);

  if (!whatsapp) {
    return <p className="text-xs text-muted">Cadastre o WhatsApp do aluno pra convidar por lá.</p>;
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="alunoId" value={alunoId} />
      <Button type="submit" size="sm" disabled={pending} className="gap-1.5">
        <MessageCircle size={14} /> {pending ? "Gerando link..." : "Convidar por WhatsApp"}
      </Button>
      {state && "error" in state && <p className="mt-1 text-xs text-danger">{state.error}</p>}
    </form>
  );
}
