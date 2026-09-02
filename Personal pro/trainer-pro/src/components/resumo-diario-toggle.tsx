"use client";

import { useState, useTransition } from "react";
import { atualizarResumoDiario } from "@/app/actions/personal";
import { Toggle } from "@/components/ui/form";

export function ResumoDiarioToggle({ ativo }: { ativo: boolean }) {
  const [checked, setChecked] = useState(ativo);
  const [, startTransition] = useTransition();

  function alternar(v: boolean) {
    setChecked(v);
    const fd = new FormData();
    if (v) fd.set("resumoDiarioAtivo", "on");
    startTransition(async () => {
      await atualizarResumoDiario(fd);
    });
  }

  return (
    <Toggle
      label="Resumo diário"
      description="Uma notificação por dia com o radar de prioridades, ciclos vencendo e o financeiro do dia."
      checked={checked}
      onChange={alternar}
    />
  );
}
