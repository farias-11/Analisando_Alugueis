import { requirePersonal } from "@/lib/data/current-user";
import { getRelatorioAlunoData } from "@/lib/data/relatorio";
import { RelatorioAlunoDoc } from "@/lib/pdf/relatorio-aluno-doc";
import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ alunoId: string }> }) {
  const { personal } = await requirePersonal();
  const { alunoId } = await params;

  const dados = await getRelatorioAlunoData(alunoId, personal);
  if (!dados) return new NextResponse("Aluno não encontrado.", { status: 404 });

  const buffer = await renderToBuffer(RelatorioAlunoDoc({ data: dados }));

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${dados.aluno.nome.toLowerCase().replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
