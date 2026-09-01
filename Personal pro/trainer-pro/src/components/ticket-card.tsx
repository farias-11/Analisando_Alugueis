import { Card, CardSubtitle, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resolverTicket } from "@/app/actions/tickets";
import { formatDataBR } from "@/lib/status";
import { getSignedUrl } from "@/lib/supabase/signed-url";
import type { Ticket } from "@/lib/types";
import Image from "next/image";

export async function TicketCard({ ticket, alunoNome }: { ticket: Ticket; alunoNome?: string }) {
  const fotoUrl = await getSignedUrl("tickets", ticket.foto_url);

  return (
    <Card>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div>
          <CardTitle>{alunoNome ?? ticket.exercicio_nome}</CardTitle>
          <CardSubtitle>
            {alunoNome ? ticket.exercicio_nome : ticket.aula_nome} · {formatDataBR(ticket.created_at)}
          </CardSubtitle>
        </div>
        <Badge status={ticket.status} />
      </div>
      <p className="text-sm text-foreground/90">{ticket.descricao}</p>
      {fotoUrl && (
        <div className="relative mt-2 h-32 w-full overflow-hidden rounded-lg bg-neutral-soft">
          <Image src={fotoUrl} alt="Foto do relato" fill className="object-cover" />
        </div>
      )}

      {ticket.status === "aberto" ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-primary">
            Marcar como resolvido
          </summary>
          <form action={resolverTicket} className="mt-2 space-y-2">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <textarea
              name="observacao"
              required
              placeholder="O que foi orientado ou feito? Ex: trocado por outro exercício."
              className="h-20 w-full rounded-lg border border-border p-2.5 text-sm"
            />
            <Button type="submit" size="sm">
              Marcar como resolvido
            </Button>
          </form>
        </details>
      ) : (
        <p className="mt-2 rounded-lg bg-success-soft px-3 py-2 text-xs text-success">
          Resolvido em {formatDataBR(ticket.resolvido_em)}: {ticket.observacao_resolucao}
        </p>
      )}
    </Card>
  );
}
