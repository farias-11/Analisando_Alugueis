import { requirePersonal } from "@/lib/data/current-user";
import { Card, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { TrocarSenhaForm } from "@/components/trocar-senha-form";
import { AvatarUpload } from "@/components/avatar-upload";
import { PushSubscribeButton } from "@/components/push-subscribe-button";
import { SuporteForm } from "@/components/suporte-form";
import { NotificacoesPreferenciasForm } from "@/components/notificacoes-preferencias-form";
import { salvarSubscricaoPushPersonal } from "@/app/actions/push-subscription";
import {
  atualizarFotoPersonal,
  atualizarPerfilPersonal,
  atualizarPreferenciasNotificacaoPersonal,
} from "@/app/actions/personal";
import { TIPOS_NOTIFICACAO_PERSONAL } from "@/lib/constantes";
import { abrirTicketSuportePersonal } from "@/app/actions/suporte";
import { criarRespostaRapida, removerRespostaRapida } from "@/app/actions/respostas-rapidas";
import { getRespostasRapidasCompletas } from "@/lib/data/respostas-rapidas";
import { ResumoDiarioToggle } from "@/components/resumo-diario-toggle";
import { logout } from "@/app/actions/auth";
import { LogOut, X } from "lucide-react";

export default async function ConfiguracoesPage() {
  const { personal, email } = await requirePersonal();
  const respostasRapidas = await getRespostasRapidasCompletas(personal.id);

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
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
            O que você quer receber
          </p>
          <NotificacoesPreferenciasForm
            action={atualizarPreferenciasNotificacaoPersonal}
            tipos={TIPOS_NOTIFICACAO_PERSONAL}
            preferencias={personal.notificacoes_preferencias}
          />
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <ResumoDiarioToggle ativo={personal.resumo_diario_ativo} />
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-3">Trocar senha</CardTitle>
        <TrocarSenhaForm />
      </Card>

      <Card>
        <CardTitle className="mb-1">Respostas rápidas em tickets</CardTitle>
        <p className="mb-3 text-sm text-muted">
          Frases prontas que aparecem como sugestão ao marcar um ticket de dor como resolvido — você
          escolhe e ainda pode ajustar o texto antes de enviar. Sem nenhuma cadastrada, mostramos 3
          exemplos prontos.
        </p>
        <div className="mb-3 space-y-2">
          {respostasRapidas.length === 0 && (
            <p className="text-xs text-muted">Nenhuma resposta própria cadastrada ainda — usando os exemplos padrão.</p>
          )}
          {respostasRapidas.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-2 rounded-lg bg-neutral-soft px-3 py-2">
              <p className="text-sm text-foreground/90">{r.texto}</p>
              <form action={removerRespostaRapida}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className="shrink-0 text-muted hover:text-danger" aria-label="Remover">
                  <X size={15} />
                </button>
              </form>
            </div>
          ))}
        </div>
        <form action={criarRespostaRapida} className="flex gap-2">
          <input
            type="text"
            name="texto"
            required
            placeholder="Nova resposta rápida..."
            className="h-10 w-full rounded-lg border border-border px-3 text-sm"
          />
          <Button type="submit" size="sm">
            Adicionar
          </Button>
        </form>
      </Card>

      <Card>
        <CardTitle className="mb-1">Ajuda e suporte</CardTitle>
        <p className="mb-3 text-sm text-muted">
          Encontrou um erro no app ou tem uma sugestão de melhoria? Fica registrado só aqui dentro,
          direto pra quem cuida do Trainer Pro.
        </p>
        <SuporteForm action={abrirTicketSuportePersonal} />
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
