import { createAdminClient } from "@/lib/supabase/admin";
import { notificarPersonal } from "@/lib/notificar";
import { NextResponse } from "next/server";

// Relatório mensal (handoff 3.4): no início de cada mês, avisa o personal que
// os relatórios em PDF dos alunos já podem ser gerados — sem mandar nada
// direto pro aluno sozinho, o personal ainda revisa e decide enviar (o botão
// "Gerar relatório PDF" já existe na Ficha do aluno, aba Geral). Chamado
// no dia 1 de cada mês pelo Vercel Cron configurado em vercel.json.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: alunos } = await supabase
    .from("alunos")
    .select("personal_id")
    .eq("status", "ativo")
    .eq("status_convite", "aceito");

  const personalIds = Array.from(new Set((alunos ?? []).map((a) => a.personal_id)));

  await Promise.all(
    personalIds.map((personalId) =>
      notificarPersonal(personalId, {
        tipo: "relatorio_mensal",
        titulo: "Relatórios do mês prontos pra gerar",
        mensagem: "Já dá pra gerar o PDF de evolução de cada aluno na ficha deles, aba Geral.",
        link: "/alunos",
      })
    )
  );

  return NextResponse.json({ notificados: personalIds.length });
}
