import Link from "next/link";
import { BrandGlyph } from "@/components/brand/glyph";

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 text-sm leading-relaxed text-foreground">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
          <BrandGlyph size={16} />
        </div>
        <span className="text-sm font-semibold">Duo Flow</span>
      </Link>

      <h1 className="mb-1 text-xl font-bold">Termos de Uso</h1>
      <p className="mb-6 text-xs text-muted">Última atualização: 01/09/2026</p>

      <p className="mb-6 rounded-xl bg-warning-soft px-3.5 py-3 text-xs text-warning">
        Modelo de referência para uso privado entre um personal e seus alunos. Antes de
        usar em produção, revise com um advogado.
      </p>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">1. Sobre o serviço</h2>
        <p>
          O Duo Flow é uma ferramenta de uso privado entre você e seu personal
          trainer, para acompanhamento de treinos, evolução física e comunicação
          relacionada ao treino. Não processa pagamentos — o controle financeiro exibido
          no app é apenas informativo, combinado diretamente com seu personal.
        </p>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">2. Cadastro e acesso</h2>
        <p>
          O acesso é feito exclusivamente por convite do seu personal — não há cadastro
          público. Você é responsável por manter sua senha em sigilo e por tudo que
          acontecer na sua conta enquanto estiver logado.
        </p>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">3. Uso adequado</h2>
        <p>
          O app deve ser usado só para o acompanhamento do seu próprio treino. Não é
          permitido tentar acessar dados de outros alunos, contornar as permissões do
          sistema, ou usar o app para qualquer finalidade ilícita.
        </p>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">4. Relato de dor/desconforto</h2>
        <p>
          A função &quot;Relatar dor/desconforto&quot; encaminha sua mensagem por
          WhatsApp diretamente ao seu personal — o app não substitui atendimento médico.
          Em caso de dor intensa, lesão grave ou emergência, procure atendimento médico
          imediatamente, além de avisar seu personal.
        </p>
      </section>

      <section className="mb-6 space-y-2">
        <h2 className="font-semibold">5. Responsabilidade</h2>
        <p>
          As orientações de treino, cargas e progressão são de responsabilidade do seu
          personal trainer. O Duo Flow é uma ferramenta de registro e comunicação —
          não substitui avaliação profissional.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">6. Encerramento de conta</h2>
        <p>
          Você pode solicitar a exclusão da sua conta a qualquer momento pela tela
          &quot;Meus dados&quot;. Seu personal também pode desativar seu acesso caso o
          acompanhamento seja encerrado.
        </p>
      </section>
    </div>
  );
}
