import { Dumbbell } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <Dumbbell size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">TRAINER PRO</h1>
            <p className="text-sm text-muted">Painel do personal trainer</p>
          </div>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-xs text-muted-2">
          Acesso restrito. Alunos entram pelo link de convite enviado pelo personal.
        </p>
      </div>
    </div>
  );
}
