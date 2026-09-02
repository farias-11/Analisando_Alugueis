import { createClient } from "@/lib/supabase/server";
import { requirePersonal } from "@/lib/data/current-user";
import { getRespostasRapidas } from "@/lib/data/respostas-rapidas";
import { TicketCard } from "@/components/ticket-card";
import type { Ticket } from "@/lib/types";

export async function TicketsTab({ alunoId }: { alunoId: string }) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("aluno_id", alunoId)
    .order("created_at", { ascending: false });

  const respostasRapidas = await getRespostasRapidas(personal.id);

  return (
    <div className="space-y-3">
      {(tickets as Ticket[] | null)?.map((t) => (
        <TicketCard key={t.id} ticket={t} respostasRapidas={respostasRapidas} />
      ))}
      {(!tickets || tickets.length === 0) && (
        <p className="text-sm text-muted">Nenhum ticket registrado.</p>
      )}
    </div>
  );
}
