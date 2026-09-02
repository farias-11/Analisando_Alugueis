"use client";

import { useActionState, useState } from "react";
import { criarExercicio, atualizarExercicio, type CriarExercicioState } from "@/app/actions/exercicios";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import type { Exercicio } from "@/lib/types";

const GRUPOS = ["Pernas", "Glúteos", "Costas", "Peito", "Ombros", "Braços", "Abdômen", "Full Body"];

function ExercicioForm({
  action,
  exercicio,
  onSalvo,
}: {
  action: (state: CriarExercicioState, formData: FormData) => Promise<CriarExercicioState>;
  exercicio?: Exercicio;
  onSalvo?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [midiaTipo, setMidiaTipo] = useState<"youtube" | "upload">(exercicio?.midia_tipo ?? "youtube");

  return (
    <form
      action={async (fd) => {
        await formAction(fd);
        onSalvo?.();
      }}
      className="space-y-3"
    >
      {exercicio && <input type="hidden" name="exercicioId" value={exercicio.id} />}
      <Field label="Nome do exercício">
        <Input name="nome" required placeholder="Ex: Leg Press 45°" defaultValue={exercicio?.nome} />
      </Field>
      <Field label="Grupo muscular">
        <Select name="grupoMuscular" required defaultValue={exercicio?.grupo_muscular ?? ""}>
          <option value="" disabled>
            Selecione
          </option>
          {GRUPOS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Instruções de execução">
        <Textarea name="instrucoes" placeholder="Como executar o movimento..." defaultValue={exercicio?.instrucoes ?? ""} />
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium">Mídia</p>
        <div className="flex gap-2">
          {(["youtube", "upload"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setMidiaTipo(t)}
              className={cn(
                "flex-1 rounded-xl border px-3 py-2 text-sm font-medium",
                midiaTipo === t ? "border-primary bg-primary-soft text-primary-dark" : "border-border"
              )}
            >
              {t === "youtube" ? "Colar link do YouTube" : "Fazer upload de arquivo(s)"}
            </button>
          ))}
        </div>
        <input type="hidden" name="midiaTipo" value={midiaTipo} />
      </div>

      {midiaTipo === "youtube" ? (
        <Field label="Link do YouTube">
          <Input name="youtubeUrl" placeholder="https://youtube.com/watch?v=..." defaultValue={exercicio?.youtube_url ?? ""} />
        </Field>
      ) : (
        <Field label="Arquivos (vídeo, gif ou imagem)" hint="Você pode selecionar vários de uma vez.">
          <input
            type="file"
            name="arquivos"
            multiple
            accept="video/*,image/*"
            className="block w-full text-sm"
          />
        </Field>
      )}

      {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Salvar exercício"}
      </Button>
    </form>
  );
}

export function NovoExercicioForm({ onSalvo }: { onSalvo?: () => void }) {
  return <ExercicioForm action={criarExercicio} onSalvo={onSalvo} />;
}

export function EditarExercicioForm({ exercicio, onSalvo }: { exercicio: Exercicio; onSalvo?: () => void }) {
  return <ExercicioForm action={atualizarExercicio} exercicio={exercicio} onSalvo={onSalvo} />;
}
