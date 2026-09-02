import { requireAluno } from "@/lib/data/current-user";
import { BottomNav } from "@/components/nav/bottom-nav";
import { NotificationBell } from "@/components/notification-bell";
import { OfflineSync } from "@/components/offline-sync";
import { contarNaoLidasAluno } from "@/lib/data/notificacoes";
import { alunoNavItems } from "./nav-items";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const { aluno } = await requireAluno();
  const naoLidas = await contarNaoLidasAluno(aluno.id);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background pb-24">
      <OfflineSync />
      {/* pointer-events-none no wrapper: ele é 100% da largura mas só o sino
          (o filho, com pointer-events-auto) deve ser clicável — sem isso essa
          faixa invisível fica por cima do TopBar inteiro (z-40 > z-30) e
          engole todo clique nele, inclusive o botão de voltar. */}
      <div className="pointer-events-none sticky top-0 z-40 h-0 overflow-visible">
        <div className="flex justify-end px-4 pt-3.5">
          <div className="pointer-events-auto">
            <NotificationBell count={naoLidas} href="/avisos" />
          </div>
        </div>
      </div>
      <main className="flex-1">{children}</main>
      <BottomNav items={alunoNavItems} />
    </div>
  );
}
