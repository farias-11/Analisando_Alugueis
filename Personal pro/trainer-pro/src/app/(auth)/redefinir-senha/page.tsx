import { Dumbbell } from "lucide-react";
import { RedefinirSenhaForm } from "./redefinir-senha-form";

export default function RedefinirSenhaPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <Dumbbell size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Redefinir senha</h1>
            <p className="text-sm text-muted">Escolha uma nova senha para sua conta.</p>
          </div>
        </div>

        <RedefinirSenhaForm />
      </div>
    </div>
  );
}
