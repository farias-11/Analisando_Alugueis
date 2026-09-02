import { requirePersonal, souAdmin } from "@/lib/data/current-user";
import { Sidebar } from "@/components/nav/sidebar";
import { BottomNav } from "@/components/nav/bottom-nav";
import { NotificationBell } from "@/components/notification-bell";
import { contarNaoLidasPersonal } from "@/lib/data/notificacoes";
import { personalBottomNavItems, personalSidebarItems } from "./nav-items";

export default async function PersonalLayout({ children }: { children: React.ReactNode }) {
  const { personal } = await requirePersonal();
  const [naoLidas, ehAdmin] = await Promise.all([contarNaoLidasPersonal(personal.id), souAdmin()]);

  const itemAdmin = { href: "/admin/suporte", label: "Suporte interno", icon: "admin" as const };
  const sidebarItems = ehAdmin ? [...personalSidebarItems, itemAdmin] : personalSidebarItems;

  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar items={sidebarItems} nome={personal.nome} notificacoes={naoLidas} />
      <div className="flex w-full flex-1 flex-col pb-20 md:pb-0">
        {/* pointer-events-none: mesma correção do layout do aluno — sem isso
            essa faixa invisível de largura total engole cliques do que está
            embaixo dela (botão de voltar de qualquer TopBar na visão mobile). */}
        <div className="pointer-events-none sticky top-0 z-40 h-0 overflow-visible md:hidden">
          <div className="flex justify-end px-4 pt-3.5">
            <div className="pointer-events-auto">
              <NotificationBell count={naoLidas} />
            </div>
          </div>
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 md:px-8 md:py-6">{children}</main>
        <BottomNav items={personalBottomNavItems} />
      </div>
    </div>
  );
}
