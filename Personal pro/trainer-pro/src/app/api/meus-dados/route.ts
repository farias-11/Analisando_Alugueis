import { createClient } from "@/lib/supabase/server";
import { requireAluno } from "@/lib/data/current-user";
import { NextResponse } from "next/server";

// Direito de acesso/portabilidade (LGPD): o aluno baixa uma cópia de tudo que
// está registrado sobre ele.
export async function GET() {
  const { aluno } = await requireAluno();
  const supabase = await createClient();

  const [medidas, fotos, anamnese, bioimpedancias, execucoes, tickets] = await Promise.all([
    supabase.from("medidas").select("*").eq("aluno_id", aluno.id),
    supabase.from("fotos_progresso").select("*").eq("aluno_id", aluno.id),
    supabase.from("anamneses").select("*").eq("aluno_id", aluno.id).maybeSingle(),
    supabase.from("bioimpedancias").select("*").eq("aluno_id", aluno.id),
    supabase.from("execucoes").select("*").eq("aluno_id", aluno.id),
    supabase.from("tickets").select("*").eq("aluno_id", aluno.id),
  ]);

  const payload = {
    exportado_em: new Date().toISOString(),
    dados_pessoais: {
      nome: aluno.nome,
      email: aluno.email,
      whatsapp: aluno.whatsapp,
      objetivo: aluno.objetivo,
      data_inicio: aluno.data_inicio,
    },
    medidas: medidas.data ?? [],
    fotos_progresso: fotos.data ?? [],
    anamnese: anamnese.data ?? null,
    bioimpedancias: bioimpedancias.data ?? [],
    execucoes_de_treino: execucoes.data ?? [],
    tickets_de_dor: tickets.data ?? [],
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="meus-dados-duo-flow.json"`,
    },
  });
}
