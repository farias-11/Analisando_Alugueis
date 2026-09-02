"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Mantém o editor de treino em sincronia entre abas/dispositivos — se o
 * personal edita no desktop enquanto tem a mesma ficha aberta no celular (ou
 * vice-versa), a tela atualiza sozinha em vez de mostrar dado desatualizado
 * até a próxima navegação manual (item C22). */
export function RealtimeTreinoSync({ cicloId, aulaIds }: { cicloId: string | null; aulaIds: string[] }) {
  const router = useRouter();
  const aulaIdsRef = useRef(aulaIds);

  useEffect(() => {
    aulaIdsRef.current = aulaIds;
  }, [aulaIds]);

  useEffect(() => {
    if (!cicloId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`treino-editor-${cicloId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aulas", filter: `ciclo_id=eq.${cicloId}` },
        () => router.refresh()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "aula_exercicios" }, (payload) => {
        const aulaId =
          (payload.new as { aula_id?: string } | null)?.aula_id ??
          (payload.old as { aula_id?: string } | null)?.aula_id;
        if (aulaId && aulaIdsRef.current.includes(aulaId)) router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cicloId, router]);

  return null;
}
