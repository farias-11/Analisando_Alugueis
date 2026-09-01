"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"]; // domingo..sábado

export function DiasSemanaPicker({
  extraFields,
  diasIniciais,
  action,
}: {
  extraFields: Record<string, string>;
  diasIniciais: number[] | null;
  action: (formData: FormData) => Promise<void>;
}) {
  const [dias, setDias] = useState<Set<number>>(new Set(diasIniciais ?? []));
  const [pending, startTransition] = useTransition();

  function toggle(dia: number) {
    const novo = new Set(dias);
    if (novo.has(dia)) novo.delete(dia);
    else novo.add(dia);
    setDias(novo);
    startTransition(() => {
      const fd = new FormData();
      for (const [key, value] of Object.entries(extraFields)) fd.set(key, value);
      novo.forEach((d) => fd.append("dias", String(d)));
      action(fd);
    });
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="mr-1 text-xs text-muted">Dias:</span>
      {DIAS.map((letra, i) => (
        <button
          key={i}
          type="button"
          disabled={pending}
          onClick={() => toggle(i)}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold",
            dias.has(i) ? "bg-primary text-white" : "bg-neutral-soft text-muted"
          )}
        >
          {letra}
        </button>
      ))}
      {dias.size === 0 && <span className="ml-1 text-[10px] text-muted-2">(rotação automática)</span>}
    </div>
  );
}
