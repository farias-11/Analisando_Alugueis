import { requireAluno } from "@/lib/data/current-user";
import { TopBar } from "@/components/nav/top-bar";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { revogarConsentimentoSaude, solicitarExclusaoConta } from "@/app/actions/lgpd";
import { Download, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { formatDataBR } from "@/lib/status";

export default async function MeusDadosPage() {
  const { aluno } = await requireAluno();

  return (
    <div>
      <TopBar title="Meus dados" back="/conta" />
      <div className="space-y-4 p-4">
        <Card>
          <CardTitle className="mb-2">Dados que coletamos</CardTitle>
          <ul className="space-y-1 text-sm text-foreground/90">
            <li>• Dados pessoais (nome, e-mail, WhatsApp)</li>
            <li>• Dados de saúde (medidas, % de gordura, fotos de evolução)</li>
            <li>• Relatos de dor/desconforto</li>
            <li>• Histórico de treino e aderência</li>
            <li>• Informações de pagamento (visíveis só para você e seu personal)</li>
          </ul>
          <p className="mt-3 text-xs text-muted">
            Seus dados são usados só para personalizar seu treino, acompanhar seu
            progresso e a comunicação com seu personal.{" "}
            <a href="/privacidade" className="text-primary underline">
              Política de Privacidade
            </a>
          </p>
        </Card>

        <Card>
          <CardTitle className="mb-2">Consentimento de dados de saúde</CardTitle>
          {aluno.consentimento_saude_aceito ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <ShieldCheck size={16} />
              Ativo desde {formatDataBR(aluno.consentimento_saude_data)}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted">
              <ShieldOff size={16} />
              Revogado{aluno.consentimento_saude_revogado_em ? ` em ${formatDataBR(aluno.consentimento_saude_revogado_em)}` : ""}
            </div>
          )}
          {aluno.consentimento_saude_aceito && (
            <form action={revogarConsentimentoSaude} className="mt-3">
              <Button type="submit" variant="outline" size="sm">
                Revogar consentimento
              </Button>
            </form>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-3">Seus direitos</CardTitle>
          <div className="space-y-2">
            <a href="/api/meus-dados">
              <Button variant="outline" className="w-full justify-start gap-2">
                <Download size={16} />
                Baixar meus dados
              </Button>
            </a>
            {aluno.exclusao_solicitada_em ? (
              <p className="rounded-xl bg-warning-soft px-3 py-2.5 text-xs text-warning">
                Exclusão solicitada em {formatDataBR(aluno.exclusao_solicitada_em)} — seu
                personal foi avisado.
              </p>
            ) : (
              <form action={solicitarExclusaoConta}>
                <Button type="submit" variant="danger" className="w-full justify-start gap-2">
                  <Trash2 size={16} />
                  Solicitar exclusão da conta
                </Button>
              </form>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
