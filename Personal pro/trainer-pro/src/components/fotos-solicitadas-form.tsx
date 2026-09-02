import { Button } from "@/components/ui/button";
import { ANGULOS_FOTO_DISPONIVEIS } from "@/lib/constantes";
import { atualizarFotosSolicitadas } from "@/app/actions/alunos";

export function FotosSolicitadasForm({ alunoId, atuais }: { alunoId: string; atuais: string[] }) {
  return (
    <form action={atualizarFotosSolicitadas} className="space-y-1">
      <input type="hidden" name="alunoId" value={alunoId} />
      {ANGULOS_FOTO_DISPONIVEIS.map((angulo) => (
        <label key={angulo} className="flex items-center justify-between gap-4 py-1.5 text-sm">
          <span>{angulo}</span>
          <input
            type="checkbox"
            name="angulos"
            value={angulo}
            defaultChecked={atuais.includes(angulo)}
            className="h-5 w-5 accent-primary"
          />
        </label>
      ))}
      <Button type="submit" size="sm" variant="outline" className="mt-2">
        Salvar
      </Button>
    </form>
  );
}
