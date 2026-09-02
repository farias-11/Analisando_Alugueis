"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { registrarSerie, registrarTodasAsSeries } from "@/app/actions/execucoes";
import { obterFila, removerDaFila } from "@/lib/offline-queue";

/** Fica montado o tempo todo no app do aluno — quando a conexão volta,
 * reenvia qualquer registro de série que ficou pendente por falta de
 * internet (ver execucao-client.tsx + lib/offline-queue.ts). */
export function OfflineSync() {
  const router = useRouter();

  useEffect(() => {
    async function sincronizar() {
      const fila = obterFila();
      if (fila.length === 0) return;

      for (const item of fila) {
        try {
          if (item.todasAsSeries) {
            await registrarTodasAsSeries({
              aulaExercicioId: item.aulaExercicioId,
              aulaId: item.aulaId,
              totalSeries: item.todasAsSeries.totalSeries,
              carga: item.carga,
              repeticoes: item.repeticoes,
            });
          } else {
            await registrarSerie({
              aulaExercicioId: item.aulaExercicioId,
              aulaId: item.aulaId,
              serieNumero: item.serieNumero,
              carga: item.carga,
              repeticoes: item.repeticoes,
            });
          }
          removerDaFila(item.id);
        } catch {
          break; // ainda offline ou erro passageiro — tenta de novo na próxima
        }
      }
      router.refresh();
    }

    if (navigator.onLine) sincronizar();
    window.addEventListener("online", sincronizar);
    return () => window.removeEventListener("online", sincronizar);
  }, [router]);

  return null;
}
