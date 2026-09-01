import { requirePersonal } from "@/lib/data/current-user";
import { getDashboardData } from "@/lib/data/dashboard";
import { Card, CardTitle } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { AlertTriangle, ChevronRight, ClipboardList, Library, MessageCircleWarning, UserPlus } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const { personal } = await requirePersonal();
  const { atencao, resumo } = await getDashboardData(personal.id);

  return (
    <div className="space-y-5 p-4 md:p-0">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted">Olá, {personal.nome.split(" ")[0]}</p>
      </div>

      {/* Bloco único de atenção — mesmo padrão em mobile e desktop (não é mais
          uma grade de cards numéricos no mobile: era a inconsistência apontada
          na revisão de design). */}
      <Card className={atencao.length ? "border-warning/30 bg-warning-soft" : undefined}>
        <CardTitle className="mb-3 flex items-center gap-2">
          <AlertTriangle size={16} className={atencao.length ? "text-warning" : "text-muted"} />
          Precisa da sua atenção hoje
        </CardTitle>
        {atencao.length === 0 ? (
          <p className="text-sm text-muted">Tudo em dia por aqui. 🎉</p>
        ) : (
          <div className="space-y-2">
            {atencao.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-3"
              >
                <span className="text-sm font-medium">{item.label}</span>
                <span className="flex items-center gap-2">
                  <span
                    className={`rounded-pill px-2 py-0.5 text-xs font-bold text-white ${
                      item.tone === "danger" ? "bg-danger" : "bg-warning"
                    }`}
                  >
                    {item.count}
                  </span>
                  <ChevronRight size={16} className="text-muted-2" />
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Resumo discreto — números sem ação pendente, não competem com o bloco acima */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="text-center">
          <p className="text-2xl font-bold">{resumo.alunosAtivos}</p>
          <p className="text-xs text-muted">Alunos ativos</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{resumo.treinosConcluidosHoje}</p>
          <p className="text-xs text-muted">Treinos hoje</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{resumo.aderenciaMedia}%</p>
          <p className="text-xs text-muted">Aderência média</p>
        </Card>
      </div>

      <div>
        <CardTitle className="mb-2">Atalhos rápidos</CardTitle>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ButtonLink href="/alunos/convidar" variant="outline" className="justify-start gap-2">
            <UserPlus size={16} /> Convidar aluno
          </ButtonLink>
          <ButtonLink href="/alunos" variant="outline" className="justify-start gap-2">
            <ClipboardList size={16} /> Ver alunos
          </ButtonLink>
          <ButtonLink href="/tickets" variant="outline" className="justify-start gap-2">
            <MessageCircleWarning size={16} /> Tickets de dor
          </ButtonLink>
          <ButtonLink href="/biblioteca" variant="outline" className="justify-start gap-2">
            <Library size={16} /> Biblioteca
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
