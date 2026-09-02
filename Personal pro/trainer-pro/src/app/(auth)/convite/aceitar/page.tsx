import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { AceitarConviteForm } from "./aceitar-form";
import { InstallPromptBanner } from "@/components/install-prompt-banner";

export default async function AceitarConvitePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login?erro=convite_invalido");
  }

  const admin = createAdminClient();
  const { data: aluno } = await admin
    .from("alunos")
    .select("nome, email, status_convite")
    .ilike("email", user.email)
    .maybeSingle();

  if (!aluno) {
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
            <Dumbbell size={24} />
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
          Defina sua senha para acessar o Trainer Pro como aluno do seu personal.
        </p>

        <AceitarConviteForm />
      </div>
    </div>
  );
}
