import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BrandGlyph } from "@/components/brand/glyph";
import { EsqueciSenhaForm } from "./esqueci-senha-form";

export default function EsqueciSenhaPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
            <BrandGlyph size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Esqueci minha senha</h1>
            <p className="text-sm text-muted">
              Informe o e-mail da sua conta para receber um link de redefinição.
            </p>
          </div>
        </div>

        <EsqueciSenhaForm />

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
