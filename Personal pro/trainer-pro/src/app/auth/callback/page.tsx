"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BrandGlyph } from "@/components/brand/glyph";

// Os e-mails de convite/recuperação do Supabase usam o template padrão (editar
// o template exige SMTP customizado, que este projeto não tem configurado).
// O template padrão aponta pro endpoint hospedado da Supabase, que verifica o
// token e redireciona de volta pra cá com a sessão numa fragment da URL
// (#access_token=...&refresh_token=...) — isso nunca chega ao servidor, só o
// navegador enxerga. Por isso essa página é client-side: lê a fragment, abre
// a sessão no cliente (o que grava os cookies via @supabase/ssr) e só então
// manda pra rota final (`next`), que aí já roda autenticada normalmente.
export default function AuthCallbackPage() {
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function confirmar() {
      await Promise.resolve(); // garante que o setState abaixo nunca é síncrono ao efeito

      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const hashError = hash.get("error_description");
      const next = new URLSearchParams(window.location.search).get("next") || "/";

      if (hashError) {
        setErro(hashError.replace(/\+/g, " "));
        return;
      }

      if (!accessToken || !refreshToken) {
        setErro("Link inválido ou expirado. Peça um novo link.");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        setErro("Não foi possível validar o link. Peça um novo.");
        return;
      }
      window.location.href = next;
    }

    confirmar();
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white">
        <BrandGlyph size={24} />
      </div>
      {erro ? (
        <>
          <p className="text-sm font-medium text-danger">{erro}</p>
          <a href="/login" className="text-sm text-primary underline">
            Voltar para o login
          </a>
        </>
      ) : (
        <p className="text-sm text-muted">Confirmando seu acesso...</p>
      )}
    </div>
  );
}
