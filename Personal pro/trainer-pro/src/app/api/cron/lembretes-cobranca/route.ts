import { createAdminClient } from "@/lib/supabase/admin";
import { notificarAluno } from "@/lib/notificar";
import { NextResponse } from "next/server";

// Cobrança automática (handoff 3.3): lembrete 3 dias antes do vencimento e no
// dia em que o pagamento realmente atrasa — só usa o que já roda dentro do
// Vercel: notificação no app + Web Push (mesmo mecanismo dos outros avisos,
// sem depender de um provedor de e-mail externo). Chamado diariamente pelo
// Vercel Cron configurado em vercel.json.
//
// Esse cron também é o único lugar que vira pagamento_status pra "atrasado"
// — nada mais fazia essa transição (o trigger no banco só marca "em_dia" ao
// registrar um pagamento nôvo), então sem isso o status ficava "em_dia" pra
// sempre até o personal marcar manualmente, e badges/radar/financeiro que
// dependem de pagamento_status="atrasado" nunca disparavam sozinhos.
type AlunoParaLembrete = {
  id: string;
  nome: string;
  pagamento_valor: number | null;
  pagamento_vencimento: string;
};

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  const hoje = new Date();
  const hojeStr = hoje.toISOString().slice(0, 10);
  const emTresDias = new Date(hoje);
  emTresDias.setDate(emTresDias.getDate() + 3);
  const emTresDiasStr = emTresDias.toISOString().slice(0, 10);

  // quem passou do vencimento e ainda constava "em_dia" vira "atrasado" agora
  const { data: recemAtrasadosData } = await supabase
    .from("alunos")
    .update({ pagamento_status: "atrasado" })
    .eq("status", "ativo")
    .eq("status_convite", "aceito")
    .eq("pagamento_status", "em_dia")
    .lt("pagamento_vencimento", hojeStr)
    .select("id, nome, pagamento_valor, pagamento_vencimento");

  // lembrete de quem vence em 3 dias — só quem ainda está em dia
  const { data: aVencerData } = await supabase
    .from("alunos")
    .select("id, nome, pagamento_valor, pagamento_vencimento")
    .eq("status", "ativo")
    .eq("status_convite", "aceito")
    .eq("pagamento_status", "em_dia")
    .eq("pagamento_vencimento", emTresDiasStr);

  const alunosAVencer = (aVencerData ?? []) as AlunoParaLembrete[];
  const alunosAtrasados = (recemAtrasadosData ?? []) as AlunoParaLembrete[];

  const valorTexto = (aluno: AlunoParaLembrete) =>
    aluno.pagamento_valor ? `R$ ${Number(aluno.pagamento_valor).toFixed(2).replace(".", ",")}` : "sua mensalidade";

  await Promise.all([
    ...alunosAVencer.map((aluno) =>
      notificarAluno(aluno.id, {
        tipo: "lembrete_cobranca",
        titulo: "Sua mensalidade vence em 3 dias",
        mensagem: `${valorTexto(aluno)} vence em 3 dias.`,
        link: "/conta",
      })
    ),
    ...alunosAtrasados.map((aluno) =>
      notificarAluno(aluno.id, {
        tipo: "lembrete_cobranca",
        titulo: "Sua mensalidade está atrasada",
        mensagem: `${valorTexto(aluno)} venceu e o pagamento ainda não foi confirmado.`,
        link: "/conta",
      })
    ),
  ]);

  return NextResponse.json({ avisados3dias: alunosAVencer.length, marcadosAtrasado: alunosAtrasados.length });
}
