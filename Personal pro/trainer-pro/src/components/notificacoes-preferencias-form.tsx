import { Button } from "@/components/ui/button";
import type { NotificacoesPreferencias } from "@/lib/types";

export function NotificacoesPreferenciasForm({
  action,
  tipos,
  preferencias,
}: {
  action: (formData: FormData) => void | Promise<void>;
  tipos: readonly { tipo: string; label: string }[];
  preferencias: NotificacoesPreferencias;
}) {
  return (
    <form action={action} className="space-y-1">
      {tipos.map(({ tipo, label }) => {
        // ausência de chave = ligado por padrão (opt-out)
        const ligado = preferencias[tipo] !== false;
        return (
          <label key={tipo} className="flex items-center justify-between gap-4 py-2 text-sm">
            <span>{label}</span>
            <input
              type="checkbox"
              name={`pref_${tipo}`}
              defaultChecked={ligado}
              className="h-5 w-5 accent-primary"
            />
          </label>
        );
      })}
      <Button type="submit" size="sm" variant="outline" className="mt-2">
        Salvar preferências
      </Button>
    </form>
  );
}
