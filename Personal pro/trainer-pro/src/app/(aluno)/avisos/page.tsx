import { requireAluno } from "@/lib/data/current-user";
import { listarNotificacoesAluno } from "@/lib/data/notificacoes";
import { marcarTodasLidasAluno } from "@/app/actions/notificacoes";
import { TopBar } from "@/components/nav/top-bar";
import { NotificationItem } from "@/components/notification-item";
import { Button } from "@/components/ui/button";

export default async function NotificacoesAlunoPage() {
  const { aluno } = await requireAluno();
  const notificacoes = await listarNotificacoesAluno(aluno.id);
  const temNaoLidas = notificacoes.some((n) => !n.lida);

  return (
    <div>
      <TopBar
        title="Notificações"
        back="/home"
        action={
          temNaoLidas ? (
            <form action={marcarTodasLidasAluno}>
              <Button type="submit" variant="ghost" size="sm">
                Marcar todas
              </Button>
            </form>
          ) : undefined
        }
      />
      <div className="space-y-2 p-4">
        {notificacoes.map((n) => (
          <NotificationItem key={n.id} notificacao={n} />
        ))}
        {notificacoes.length === 0 && (
          <p className="px-1 text-sm text-muted">Nenhuma notificação por aqui ainda.</p>
        )}
      </div>
    </div>
  );
}
