import { requirePersonal } from "@/lib/data/current-user";
import { listarNotificacoesPersonal } from "@/lib/data/notificacoes";
import { marcarTodasLidasPersonal } from "@/app/actions/notificacoes";
import { NotificationItem } from "@/components/notification-item";
import { Button } from "@/components/ui/button";

export default async function NotificacoesPersonalPage() {
  const { personal } = await requirePersonal();
  const notificacoes = await listarNotificacoesPersonal(personal.id);
  const temNaoLidas = notificacoes.some((n) => !n.lida);

  return (
    <div className="space-y-4 p-4 md:p-0">
      <div className="flex items-center justify-between pr-14 md:pr-0">
        <h1 className="text-xl font-bold">Notificações</h1>
        {temNaoLidas && (
          <form action={marcarTodasLidasPersonal}>
            <Button type="submit" variant="ghost" size="sm">
              Marcar todas como lidas
            </Button>
          </form>
        )}
      </div>
      <div className="space-y-2">
        {notificacoes.map((n) => (
          <NotificationItem key={n.id} notificacao={n} />
        ))}
        {notificacoes.length === 0 && (
          <p className="text-sm text-muted">Nenhuma notificação por aqui ainda.</p>
        )}
      </div>
    </div>
  );
}
