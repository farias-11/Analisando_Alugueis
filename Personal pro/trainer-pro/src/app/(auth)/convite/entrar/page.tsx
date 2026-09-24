import { BrandGlyph } from "@/components/brand/glyph";
import { ButtonLink } from "@/components/ui/button";

// Página intermediária entre o link mandado por WhatsApp/e-mail e a
// verificação de fato (/auth/confirm). Existe só por causa de um bug real:
// o link "cru" do Supabase (action_link, do generateLink) é de USO ÚNICO, e
// o WhatsApp busca esse link sozinho pra montar a prévia da mensagem antes
// do aluno tocar nele — isso consome o token, e quando o aluno clica de
// verdade o Supabase já recusa ("Email link is invalid or has expired").
// Mandando esse link (sem token/verificação nenhuma) em vez do action_link,
// o rastreador do WhatsApp só vê uma página inerte pra gerar a prévia; a
// verificação só acontece quando alguém realmente toca no botão abaixo.
export default async function EntrarConvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string }>;
}) {
  const { token_hash, type, next } = await searchParams;

  if (!token_hash || !type) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm font-medium text-danger">Link inválido. Peça um novo ao seu personal.</p>
        <a href="/login" className="text-sm text-primary underline">
          Voltar para o login
        </a>
      </div>
    );
  }

  const destino = `/auth/confirm?${new URLSearchParams({ token_hash, type, next: next || "/" }).toString()}`;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
        <BrandGlyph size={24} />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight">Você foi convidado!</h1>
        <p className="mt-1 text-sm text-muted">Toque no botão abaixo para acessar o Duo Flow.</p>
      </div>
      <ButtonLink href={destino} prefetch={false} className="w-full max-w-xs">
        Entrar
      </ButtonLink>
    </div>
  );
}
