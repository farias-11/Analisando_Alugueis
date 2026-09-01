import { requirePersonal } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { TicketCard } from "@/components/ticket-card";
import Link from "next/link";
import type { Ticket } from "@/lib/types";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { personal } = await requirePersonal();
  const { status = "aberto" } = await searchParams;
  const supabase = await createClient();

  const { data: alunos } = await supabase.from("alunos").select("id, nome").eq("personal_id", personal.id);
  const nomesPorId = new Map((alunos ?? []).map((a) => [a.id, a.nome]));
  const alunoIds = (alunos ?? []).map((a) => a.id);

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .in("aluno_id", alunoIds.length ? alunoIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("status", status)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4 p-4 md:p-0">
      <h1 className="text-xl font-bold">Tickets de dor</h1>

      <div className="flex gap-2">
        {(["aberto", "resolvido"] as const).map((s) => (
          <Link
            key={s}
            href={`/tickets?status=${s}`}
            className={`rounded-pill border px-3.5 py-1.5 text-sm font-medium ${status === s ? "border-primary bg-primary-soft text-primary-dark" : "border-border text-muted"}`}
          >
            {s === "aberto" ? "Abertos" : "Resolvidos"}
          </Link>
        ))}
      </div>

      <div className="space-y-3">
        {((tickets as Ticket[] | null) ?? []).map((t) => (
          <TicketCard key={t.id} ticket={t} alunoNome={nomesPorId.get(t.aluno_id)} />
        ))}
        {(!tickets || tickets.length === 0) && (
          <p className="text-sm text-muted">Nenhum ticket {status === "aberto" ? "aberto" : "resolvido"}.</p>
        )}
      </div>
    </div>
  );
}
