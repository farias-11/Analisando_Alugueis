import { requireAluno } from "@/lib/data/current-user";
import { TopBar } from "@/components/nav/top-bar";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/actions/auth";
import { atualizarFotoAluno } from "@/app/actions/conta";
import { TrocarSenhaForm } from "@/components/trocar-senha-form";
import { AvatarUpload } from "@/components/avatar-upload";
import { PushSubscribeButton } from "@/components/push-subscribe-button";
import { salvarSubscricaoPushAluno } from "@/app/actions/push-subscription";
import { ChevronRight, HelpCircle, Info, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default async function ContaPage() {
  const { aluno, email } = await requireAluno();

  return (
    <div>
      <TopBar title="Conta" />
      <div className="space-y-4 p-4">
        <Card className="flex items-center gap-3">
          <AvatarUpload fotoUrl={aluno.foto_url} nome={aluno.nome} action={atualizarFotoAluno} />
          <div>
            <p className="text-base font-semibold">{aluno.nome}</p>
            <p className="text-sm text-muted">{email}</p>
          </div>
        </Card>

        <div className="space-y-2">
          <Link href="/dados">
            <Card className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <ShieldCheck size={18} className="text-primary" />
                Meus dados (privacidade e LGPD)
              </span>
              <ChevronRight size={18} className="text-muted-2" />
            </Card>
          </Link>
          <Link href="/ajuda">
            <Card className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <HelpCircle size={18} className="text-primary" />
                Ajuda e suporte
              </span>
              <ChevronRight size={18} className="text-muted-2" />
            </Card>
          </Link>
          <Link href="/sobre">
            <Card className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Info size={18} className="text-primary" />
                Sobre o app
              </span>
              <ChevronRight size={18} className="text-muted-2" />
            </Card>
          </Link>
        </div>

        <Card>
          <CardTitle className="mb-3">Notificações</CardTitle>
          <p className="mb-3 text-sm text-muted">
            Receba avisos de lembrete e respostas do seu personal mesmo com o app fechado.
          </p>
          <PushSubscribeButton salvarSubscricao={salvarSubscricaoPushAluno} />
        </Card>

        <Card>
          <CardTitle className="mb-3">Trocar senha</CardTitle>
          <TrocarSenhaForm />
        </Card>

        <form action={logout}>
          <Button type="submit" variant="danger" className="w-full gap-2">
            <LogOut size={16} />
            Sair da conta
          </Button>
        </form>
      </div>
    </div>
  );
}
