import { requireAluno } from "@/lib/data/current-user";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { NotificationBell } from "@/components/notification-bell";
import { OfflineSync } from "@/components/offline-sync";
import { contarNaoLidasAluno } from "@/lib/data/notificacoes";
import { alunoNavItems } from "./nav-items";

export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const { aluno } = await requireAluno();
  const naoLidas = await contarNaoLidasAluno(aluno.id);

  return (
    <div className="flex min-h-dvh bg-background">
      <OfflineSync />
      {/* Sidebar (desktop, md+): mesmo componente do lado do personal — some
          no mobile, onde a BottomNav assume a navegação. */}
      <Sidebar items={alunoNavItems} nome={aluno.nome} notificacoes={naoLidas} notificacoesHref="/avisos" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-24 md:max-w-none md:pb-0">
        {/* pointer-events-none no wrapper: ele é 100% da largura mas só o sino
            (o filho, com pointer-events-auto) deve ser clicável — sem isso essa
            faixa invisível fica por cima do TopBar inteiro (z-40 > z-30) e
            engole todo clique nele, inclusive o botão de voltar. md:hidden
            porque no desktop o sino já vem pelo Sidebar. */}
        <div className="pointer-events-none sticky top-0 z-40 h-0 overflow-visible md:hidden">
          {/* pt-[8.5px] (não pt-3.5, que só alinhava o TOPO do sino com o
              topo do texto do título) centraliza de verdade o círculo de
              36px do sino na altura real do TopBar (~53px: py-3.5 + linha
              do título) — sem isso ele ficava sempre um pouco abaixo do
              centro, parecendo "encostado" na borda de baixo do cabeçalho. */}
          <div className="flex justify-end px-4 pt-[8.5px]">
            <div className="pointer-events-auto">
              <NotificationBell count={naoLidas} href="/avisos" />
            </div>
          </div>
        </div>
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col md:max-w-4xl md:px-10 md:py-8">{children}</main>
        <BottomNav items={alunoNavItems} />
      </div>
    </div>
  );
}
