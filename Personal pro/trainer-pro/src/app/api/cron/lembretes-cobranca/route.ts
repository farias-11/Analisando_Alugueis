import { createAdminClient } from "@/lib/supabase/admin";
import { notificarAluno } from "@/lib/notificar";
import { NextResponse } from "next/server";

// Cobrança automática (handoff 3.3): lembrete 3 dias antes do vencimento e no
// dia — só pra alunos ainda "em_dia" (uma vez atrasado, a cobrança passa a
// ser manual via WhatsApp, ver mensagemCobranca no dashboard/ficha do aluno).
// Só usa o que já roda dentro do Vercel: notificação no app + Web Push
// (mesmo mecanismo dos outros avisos, sem depender de um provedor de e-mail
// externo). Chamado diariamente pelo Vercel Cron configurado em vercel.json.
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

  const { data } = await supabase
    .from("alunos")
    .select("id, nome, pagamento_valor, pagamento_vencimento")
    .eq("status", "ativo")
    .eq("status_convite", "aceito")
    .eq("pagamento_status", "em_dia")
    .in("pagamento_vencimento", [hojeStr, emTresDiasStr]);

  const alunos = (data ?? []) as AlunoParaLembrete[];

  await Promise.all(
    alunos.map((aluno) => {
      const venceHoje = aluno.pagamento_vencimento === hojeStr;
      const valorTexto = aluno.pagamento_valor
        ? `R$ ${Number(aluno.pagamento_valor).toFixed(2).replace(".", ",")}`
        : "sua mensalidade";
      return notificarAluno(aluno.id, {
        tipo: "lembrete_cobranca",
        titulo: venceHoje ? "Sua mensalidade vence hoje" : "Sua mensalidade vence em 3 dias",
        mensagem: `${valorTexto} vence ${venceHoje ? "hoje" : "em 3 dias"}.`,
        link: "/conta",
      });
    })
  );

  return NextResponse.json({ notificados: alunos.length });
}
