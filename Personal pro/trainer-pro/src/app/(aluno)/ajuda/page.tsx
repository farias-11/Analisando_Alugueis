import { requireAluno } from "@/lib/data/current-user";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/nav/top-bar";
import { Card, CardTitle } from "@/components/ui/card";
import { buildWhatsappLink } from "@/lib/whatsapp";
import { MessageCircle, Phone } from "lucide-react";

export default async function AjudaPage() {
  const { aluno } = await requireAluno();
  const supabase = await createClient();
  const { data: personal } = await supabase
    .from("personals")
    .select("nome, whatsapp_numero, email")
    .eq("id", aluno.personal_id)
    .maybeSingle();

  return (
    <div>
      <TopBar title="Ajuda e suporte" back="/conta" />
      <div className="space-y-4 p-4">
        <Card>
          <CardTitle className="mb-2">Fale com seu personal</CardTitle>
          <p className="mb-3 text-sm text-muted">
            Dúvidas sobre o treino, pagamento ou o app? O canal mais rápido é o WhatsApp do
            seu personal{personal?.nome ? `, ${personal.nome}` : ""}.
          </p>
          {personal?.whatsapp_numero && (
            <a
              href={buildWhatsappLink(personal.whatsapp_numero, `Oi ${personal.nome}! Preciso de ajuda com o app.`)}
              target="_blank"
              className="flex items-center gap-2 rounded-xl bg-success-soft px-3.5 py-3 text-sm font-medium text-success"
            >
              <MessageCircle size={18} />
              Chamar no WhatsApp
            </a>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-2">Perguntas comuns</CardTitle>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Sentiu dor durante o treino?</p>
              <p className="text-muted">
                Use o botão &quot;Relatar dor/desconforto&quot; na tela de execução do
                exercício — ele já avisa seu personal direto pelo WhatsApp.
              </p>
            </div>
            <div>
              <p className="font-medium">Esqueceu de atualizar suas medidas?</p>
              <p className="text-muted">
                A qualquer momento, vá em Progresso → Minhas medidas.
              </p>
            </div>
            <div>
              <p className="font-medium">Quer saber o que é feito com seus dados?</p>
              <p className="text-muted">Veja a tela &quot;Meus dados&quot;, na sua Conta.</p>
            </div>
          </div>
        </Card>

        {personal?.email && (
          <Card className="flex items-center gap-2 text-sm text-muted">
            <Phone size={16} />
            Contato administrativo: {personal.email}
          </Card>
        )}
      </div>
    </div>
  );
}
