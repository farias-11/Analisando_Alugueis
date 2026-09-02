"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

function formatarDuracao(segundos: number) {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  const s = segundos % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Cronômetro ao vivo do treino — visível em toda tela de exercício, não só
 * no resumo final, pra ficar claro o tempo passado desde já (sem precisar
 * esperar acabar o treino pra ver algum número). Conta a partir da primeira
 * série registrada hoje nessa aula; se ainda não tem nenhuma, começa do
 * momento em que essa tela abriu. */
export function TreinoTimer({ inicioIso }: { inicioIso: string | null }) {
  const [agora, setAgora] = useState<number | null>(null);
  const [inicioMs] = useState(() => (inicioIso ? new Date(inicioIso).getTime() : Date.now()));

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000);
    queueMicrotask(() => setAgora(Date.now()));
    return () => clearInterval(id);
  }, []);

  if (agora === null) return null; // evita mismatch de hidratação (server nunca sabe "agora")

  const segundos = Math.max(0, Math.floor((agora - inicioMs) / 1000));

  return (
    <span className="flex items-center gap-1 rounded-pill bg-neutral-soft px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground">
      <Timer size={13} className="text-primary" />
      {formatarDuracao(segundos)}
    </span>
  );
}
