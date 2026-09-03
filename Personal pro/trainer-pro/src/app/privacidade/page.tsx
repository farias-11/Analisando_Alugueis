import Link from "next/link";
import { BrandGlyph } from "@/components/brand/glyph";

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-sm leading-relaxed text-foreground">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <BrandGlyph size={16} />
        </div>
        <span className="text-sm font-semibold">Duo Flow</span>
      </Link>

      <h1 className="mb-1 text-xl font-bold">Política de Privacidade</h1>
      <p className="mb-6 text-xs text-muted">Última atualização: 01/09/2026</p>

      <p className="mb-6 rounded-xl bg-warning-soft px-3.5 py-3 text-xs text-warning">
        Modelo de referência, escrito para cobrir os requisitos de LGPD levantados no
        planejamento deste produto. Antes de usar em produção com alunos reais, revise
        com um advogado — em especial as seções 1, 4 e 8.
      </p>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">1. Quem trata seus dados</h2>
        <p>
          Seu personal trainer é o controlador dos seus dados — decide para que servem e
          como são usados. O Duo Flow é o operador, que trata os dados seguindo as
          instruções dele.
        </p>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">2. Quais dados coletamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Dados pessoais: nome, e-mail, WhatsApp, foto de perfil.</li>
          <li>
            Dados de saúde (categoria sensível — LGPD art. 5º, II e art. 11): respostas da
            anamnese, medidas corporais, % de gordura, bioimpedância, fotos de progresso,
            relatos de dor/desconforto e fotos anexadas a eles.
          </li>
          <li>Dados de uso do treino: séries, cargas, repetições, histórico de execução.</li>
          <li>Dados financeiros: status e histórico de pagamento junto ao personal.</li>
          <li>Dados técnicos: cookies de sessão estritamente necessários para login, sem rastreamento de terceiros ou publicidade.</li>
        </ul>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">3. Para que usamos</h2>
        <p>
          Exclusivamente para o acompanhamento do seu treino e evolução física pelo seu
          personal — nunca para fins de marketing ou compartilhamento com terceiros.
        </p>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">4. Com quem compartilhamos</h2>
        <p>
          Em regra, com ninguém além do seu próprio personal. Exceção: ao usar a função
          &quot;Relatar dor/desconforto&quot;, sua mensagem (e foto, se anexada) abre o
          WhatsApp para envio direto ao personal — a partir desse ponto, o dado trafega
          pelo WhatsApp (Meta/WhatsApp Inc.) e sai do controle desta plataforma. Os dados
          também ficam hospedados na infraestrutura do Supabase (operador técnico), em
          servidores na região São Paulo (sa-east-1).
        </p>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">5. Por quanto tempo guardamos</h2>
        <p>
          Enquanto sua conta estiver ativa. Contas inativas têm os dados anonimizados ou
          excluídos dentro de um prazo definido pelo personal, ou imediatamente mediante
          solicitação de exclusão.
        </p>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">6. Seus direitos</h2>
        <p>
          Nos termos do art. 18 da LGPD, você pode confirmar a existência de tratamento,
          acessar, corrigir, anonimizar, portar ou eliminar seus dados, e revogar o
          consentimento de dados de saúde a qualquer momento. Os dois primeiros (baixar
          uma cópia e solicitar exclusão) estão disponíveis direto na tela
          &quot;Meus dados&quot; dentro do app; para os demais, fale com seu personal
          pela tela &quot;Ajuda e suporte&quot;.
        </p>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">7. Segurança</h2>
        <p>
          Dados hospedados no Brasil, tráfego em HTTPS, dados em repouso criptografados,
          isolamento de dados por aluno via Row Level Security, e senhas nunca armazenadas
          em texto puro.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">8. Encarregado e reclamações</h2>
        <p>
          Dúvidas sobre este documento ou sobre o tratamento dos seus dados podem ser
          enviadas ao seu personal (controlador), pelos canais de contato informados no
          app. Caso não seja atendido, você pode reclamar diretamente à Autoridade
          Nacional de Proteção de Dados (ANPD) — gov.br/anpd.
        </p>
      </section>
    </div>
  );
}
