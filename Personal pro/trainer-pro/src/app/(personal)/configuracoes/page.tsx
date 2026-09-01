import { requirePersonal } from "@/lib/data/current-user";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { TrocarSenhaForm } from "@/components/trocar-senha-form";
import { AvatarUpload } from "@/components/avatar-upload";
import { PushSubscribeButton } from "@/components/push-subscribe-button";
import { salvarSubscricaoPushPersonal } from "@/app/actions/push-subscription";
import { atualizarFotoPersonal, atualizarPerfilPersonal } from "@/app/actions/personal";
import { logout } from "@/app/actions/auth";
import { LogOut } from "lucide-react";

export default async function ConfiguracoesPage() {
  const { personal, email } = await requirePersonal();

  return (
    <div className="space-y-4 p-4 md:max-w-lg md:p-0">
      <h1 className="text-xl font-bold">Configurações / conta</h1>

      <Card>
        <CardTitle className="mb-3">Dados pessoais</CardTitle>
        <div className="mb-4 flex items-center gap-3">
          <AvatarUpload fotoUrl={personal.foto_url} nome={personal.nome} action={atualizarFotoPersonal} />
          <p className="text-xs text-muted">Toque na foto para trocar.</p>
        </div>
        <form action={atualizarPerfilPersonal} className="space-y-3">
          <Field label="Nome">
            <Input name="nome" defaultValue={personal.nome} required />
          </Field>
          <Field label="E-mail">
            <Input value={email} disabled />
          </Field>
          <Field label="WhatsApp (usado no wa.me dos tickets de dor)" hint="Só números, com DDI. Ex: 5511999999999">
            <Input name="whatsappNumero" defaultValue={personal.whatsapp_numero} required />
          </Field>
          <Button type="submit" size="sm">
            Salvar alterações
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle className="mb-3">Notificações</CardTitle>
        <p className="mb-3 text-sm text-muted">
          Receba avisos de novos tickets de dor e pedidos dos alunos mesmo com o app fechado.
        </p>
        <PushSubscribeButton salvarSubscricao={salvarSubscricaoPushPersonal} />
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
  );
}
