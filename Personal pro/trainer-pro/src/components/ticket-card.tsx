import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResolverTicketForm } from "@/components/resolver-ticket-form";
import { formatDataBR, diasDesde } from "@/lib/status";
import { getSignedUrl } from "@/lib/supabase/signed-url";
import type { Ticket } from "@/lib/types";
import Image from "next/image";
import { Clock } from "lucide-react";

const DIAS_LEMBRETE_TICKET_ABERTO = 3;

export async function TicketCard({
  ticket,
  alunoNome,
  respostasRapidas = [],
}: {
  ticket: Ticket;
  alunoNome?: string;
  respostasRapidas?: string[];
}) {
  const fotoUrl = await getSignedUrl("tickets", ticket.foto_url);
  const diasAberto = diasDesde(ticket.created_at) ?? 0;
  const precisaLembrete = ticket.status === "aberto" && diasAberto >= DIAS_LEMBRETE_TICKET_ABERTO;

  return (
    <Card className={precisaLembrete ? "border-warning/40" : undefined}>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <CardTitle>{alunoNome ?? ticket.exercicio_nome}</CardTitle>
          <CardSubtitle>
            {alunoNome ? ticket.exercicio_nome : ticket.aula_nome} · {formatDataBR(ticket.created_at)}
          </CardSubtitle>
        </div>
        <Badge status={ticket.status} />
      </div>
      {ticket.status === "aberto" && (
        <p
          className={`mb-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
            precisaLembrete ? "bg-warning-soft text-warning" : "bg-neutral-soft text-muted"
          }`}
        >
          <Clock size={13} />
          {precisaLembrete
            ? `Aberto há ${diasAberto} dias sem resposta — a conversa acontece pelo WhatsApp, não esqueça de marcar como resolvido aqui.`
            : `Aberto há ${diasAberto} ${diasAberto === 1 ? "dia" : "dias"}`}
        </p>
      )}
      <p className="text-sm text-foreground/90">{ticket.descricao}</p>
      {fotoUrl && (
        <div className="relative mt-2 h-32 w-full overflow-hidden rounded-lg bg-neutral-soft">
          <Image
            src={fotoUrl}
            alt="Foto do relato"
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover"
          />
        </div>
      )}

      {ticket.status === "aberto" ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            Marcar como resolvido
          </summary>
          <ResolverTicketForm ticketId={ticket.id} respostasRapidas={respostasRapidas} />
        </details>
      ) : (
        <p className="mt-2 rounded-lg bg-success-soft px-3 py-2 text-xs text-success">
          Resolvido em {formatDataBR(ticket.resolvido_em)}: {ticket.observacao_resolucao}
        </p>
      )}
    </Card>
  );
}
