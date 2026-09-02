import { createAdminClient } from "@/lib/supabase/admin";
import { notificarPersonal } from "@/lib/notificar";
import { diasRestantes } from "@/lib/status";
import { NextResponse } from "next/server";

// Resumo diário (handoff, seção 4 — Configurações): notificação única por
// dia com o essencial do radar (pagamento atrasado, ciclo vencendo, ticket
// aberto), só pra quem ligou a opção. Versão enxuta e própria do cron —
// não reaproveita getDashboardData porque ela usa o client preso à sessão
// do personal logado (RLS via cookie), que não existe aqui; refazer as
// mesmas contas com o client admin, agrupando por personal_id de uma vez,
// evita rodar a consulta completa do dashboard uma vez pra cada personal.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: personals } = await supabase.from("personals").select("id").eq("resumo_diario_ativo", true);
  const personalIds = (personals ?? []).map((p) => p.id);
  if (!personalIds.length) return NextResponse.json({ notificados: 0 });

  const { data: alunos } = await supabase
    .from("alunos")
    .select("id, personal_id, pagamento_status")
    .in("personal_id", personalIds)
    .eq("status", "ativo")
    .eq("status_convite", "aceito");

  const personalPorAluno = new Map((alunos ?? []).map((a) => [a.id, a.personal_id]));
  const alunoIds = (alunos ?? []).map((a) => a.id);

  const [{ data: ciclosAtivos }, { data: ticketsAbertos }] = await Promise.all([
    alunoIds.length
      ? supabase.from("ciclos").select("aluno_id, data_fim").eq("ativo", true).in("aluno_id", alunoIds)
      : Promise.resolve({ data: [] as { aluno_id: string; data_fim: string }[] }),
    alunoIds.length
      ? supabase.from("tickets").select("aluno_id").eq("status", "aberto").in("aluno_id", alunoIds)
      : Promise.resolve({ data: [] as { aluno_id: string }[] }),
  ]);

  const contagem = new Map<string, { atrasados: number; vencendo: number; ticketsAbertos: number }>();
  for (const id of personalIds) contagem.set(id, { atrasados: 0, vencendo: 0, ticketsAbertos: 0 });

  for (const a of alunos ?? []) {
    if (a.pagamento_status === "atrasado") contagem.get(a.personal_id)!.atrasados++;
  }
  for (const c of ciclosAtivos ?? []) {
    const personalId = personalPorAluno.get(c.aluno_id);
    if (!personalId) continue;
    const restantes = diasRestantes(c.data_fim);
    if (restantes >= 0 && restantes <= 7) contagem.get(personalId)!.vencendo++;
  }
  for (const t of ticketsAbertos ?? []) {
    const personalId = personalPorAluno.get(t.aluno_id);
    if (personalId) contagem.get(personalId)!.ticketsAbertos++;
  }

  let notificados = 0;
  await Promise.all(
    personalIds.map(async (personalId) => {
      const c = contagem.get(personalId)!;
      if (c.atrasados === 0 && c.vencendo === 0 && c.ticketsAbertos === 0) return;

      const partes = [
        c.atrasados > 0 ? `${c.atrasados} pagamento${c.atrasados === 1 ? "" : "s"} atrasado${c.atrasados === 1 ? "" : "s"}` : null,
        c.vencendo > 0 ? `${c.vencendo} ciclo${c.vencendo === 1 ? "" : "s"} vencendo` : null,
        c.ticketsAbertos > 0 ? `${c.ticketsAbertos} ticket${c.ticketsAbertos === 1 ? "" : "s"} aberto${c.ticketsAbertos === 1 ? "" : "s"}` : null,
      ].filter(Boolean);

      await notificarPersonal(personalId, {
        tipo: "resumo_diario",
        titulo: "Resumo do dia",
        mensagem: `${partes.join(", ")}.`,
        link: "/dashboard",
      });
      notificados++;
    })
  );

  return NextResponse.json({ notificados });
}
