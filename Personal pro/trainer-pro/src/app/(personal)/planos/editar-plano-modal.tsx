"use client";

import { useState } from "react";
import { EditarPlanoForm } from "./plano-form";
import { Pencil, X } from "lucide-react";
import type { Plano } from "@/lib/types";

export function EditarPlanoModal({ plano }: { plano: Plano }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button onClick={() => setAberto(true)} className="flex items-center gap-1 text-xs text-primary">
        <Pencil size={12} /> Editar
      </button>

      {aberto && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4">
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface p-4 shadow-lg md:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Editar plano</p>
              <button onClick={() => setAberto(false)} className="text-muted-2">
                <X size={18} />
              </button>
            </div>
            <EditarPlanoForm plano={plano} onSalvo={() => setAberto(false)} />
          </div>
        </div>
      )}
    </>
  );
}
