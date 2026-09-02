"use client";

import { useState } from "react";
import { resolverTicket } from "@/app/actions/tickets";
import { Button } from "@/components/ui/button";

export function ResolverTicketForm({
  ticketId,
  respostasRapidas,
}: {
  ticketId: string;
  respostasRapidas: string[];
}) {
  const [observacao, setObservacao] = useState("");

  return (
    <form action={resolverTicket} className="mt-2 space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      {respostasRapidas.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {respostasRapidas.map((texto, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setObservacao((atual) => (atual ? `${atual} ${texto}` : texto))}
              className="rounded-pill border border-border bg-neutral-soft px-2.5 py-1 text-xs text-foreground/80 hover:border-primary hover:text-primary"
            >
              {texto.length > 40 ? `${texto.slice(0, 40)}…` : texto}
            </button>
          ))}
        </div>
      )}
      <textarea
        name="observacao"
        required
        value={observacao}
        onChange={(e) => setObservacao(e.target.value)}
        placeholder="O que foi orientado ou feito? Ex: trocado por outro exercício."
        className="h-20 w-full rounded-lg border border-border p-2.5 text-sm"
      />
      <Button type="submit" size="sm">
        Marcar como resolvido
      </Button>
    </form>
  );
}
