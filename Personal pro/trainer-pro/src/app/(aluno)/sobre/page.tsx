import { TopBar } from "@/components/nav/top-bar";
import { Card } from "@/components/ui/card";
import { BrandGlyph } from "@/components/brand/glyph";
import Link from "next/link";

export default function SobrePage() {
  return (
    <div>
      <TopBar title="Sobre o app" back="/conta" />
      <div className="space-y-4 p-4">
        <Card className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
            <BrandGlyph size={26} />
          </div>
          <div>
            <p className="text-lg font-bold">Duo Flow</p>
            <p className="text-sm text-muted">Versão 1.0</p>
          </div>
          <p className="max-w-xs text-sm text-muted">
            App para acompanhamento de treinos, evolução e comunicação com o seu
            personal trainer.
          </p>
        </Card>

        <Card className="space-y-2">
          <Link href="/termos" className="block text-sm font-medium text-primary">
            Termos de Uso
          </Link>
          <Link href="/privacidade" className="block text-sm font-medium text-primary">
            Política de Privacidade
          </Link>
        </Card>
      </div>
    </div>
  );
}
