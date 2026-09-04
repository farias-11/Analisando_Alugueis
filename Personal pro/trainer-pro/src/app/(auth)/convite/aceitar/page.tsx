import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { BrandGlyph } from "@/components/brand/glyph";
import { AceitarConviteForm } from "./aceitar-form";
import { InstallPromptBanner } from "@/components/install-prompt-banner";

export default async function AceitarConvitePage({
  searchParams,
}: {
  searchParams: Promise<{ alunoId?: string }>;
}) {
  const { alunoId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login?erro=convite_invalido");
  }

  const admin = createAdminClient();
  // alunoId vem do link gerado pelo personal (evita ambiguidade: o mesmo
  // e-mail pode estar pendente em dois personals diferentes ao mesmo tempo).
  // Sem alunoId (link antigo, gerado antes dessa mudança) cai no fallback
  // por e-mail.
  const { data: aluno } = alunoId
    ? await admin.from("alunos").select("id, nome, email, status_convite").eq("id", alunoId).maybeSingle()
    : await admin.from("alunos").select("id, nome, email, status_convite").ilike("email", user.email).maybeSingle();

  if (!aluno || aluno.email.toLowerCase() !== user.email.toLowerCase()) {
    redirect("/login?erro=convite_invalido");
  }

  if (aluno.status_convite === "aceito") {
    redirect("/home");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-background px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <BrandGlyph size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Você foi convidado!</h1>
            <p className="text-sm text-muted">
              {aluno.nome} · {aluno.email}
            </p>
          </div>
        </div>

        {/* mostra o convite pra instalar já na primeira tela — é o momento em
            que o aluno mais provavelmente está com o navegador aberto vindo
            do e-mail, antes mesmo de definir a senha */}
        <div className="mb-5">
          <InstallPromptBanner />
        </div>

        <p className="mb-5 text-center text-sm text-muted">
          Defina sua senha para acessar o Duo Flow como aluno do seu personal.
        </p>

        <AceitarConviteForm alunoId={aluno.id} />
      </div>
    </div>
  );
}
