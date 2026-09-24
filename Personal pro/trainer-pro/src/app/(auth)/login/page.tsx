import { BrandGlyph } from "@/components/brand/glyph";
import { LoginForm } from "./login-form";

const MENSAGENS_ERRO: Record<string, string> = {
  convite_invalido:
    "Seu link de convite expirou ou já foi usado. Peça um novo convite ao seu personal — ou, se já tinha criado a senha antes, tente entrar com ela abaixo.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const erroInicial = erro ? MENSAGENS_ERRO[erro] : undefined;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <BrandGlyph size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">DUO FLOW</h1>
            <p className="text-sm text-muted">O vínculo entre você e seu personal</p>
          </div>
        </div>

        <LoginForm erroInicial={erroInicial} />

        <p className="mt-6 text-center text-xs text-muted-2">
          Acesso restrito. Alunos entram pelo link de convite enviado pelo personal.
        </p>
      </div>
    </div>
  );
}
