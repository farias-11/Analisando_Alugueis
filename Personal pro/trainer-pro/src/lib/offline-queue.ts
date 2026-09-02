"use client";

// Fila local (localStorage) de registros de série que não conseguiram ser
// salvos por falta de conexão — comum na academia. O treino do dia fica em
// cache (via service worker) pra continuar navegável offline, e as execuções
// ficam aqui até a conexão voltar (item C21).

const CHAVE = "trainer-pro-fila-execucoes";

export interface RegistroPendente {
  id: string;
  aulaExercicioId: string;
  aulaId: string;
  serieNumero: number;
  carga: number | null;
  repeticoes: number | null;
  todasAsSeries?: { totalSeries: number };
  criadoEm: number;
}

export function enfileirarExecucao(item: Omit<RegistroPendente, "id" | "criadoEm">) {
  const fila = obterFila();
  fila.push({ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, criadoEm: Date.now() });
  salvarFila(fila);
}

export function obterFila(): RegistroPendente[] {
  try {
    const raw = localStorage.getItem(CHAVE);
    return raw ? (JSON.parse(raw) as RegistroPendente[]) : [];
  } catch {
    return [];
  }
}

function salvarFila(fila: RegistroPendente[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(fila));
  } catch {
    // se não der pra persistir, perde a fila offline — não trava o app
  }
}

export function removerDaFila(id: string) {
  salvarFila(obterFila().filter((r) => r.id !== id));
}
