import "server-only";

/** Compartilhado entre as ações de aula_exercicios e template_aula_exercicios
 * (mesma estrutura de campos nas duas tabelas). Não pode viver num arquivo
 * "use server" porque esses só podem exportar funções async. */
export function camposExercicioAula(formData: FormData) {
  const tipo = formData.get("tipo") === "cardio" ? "cardio" : "forca";
  const ehCardio = tipo === "cardio";
  return {
    tipo,
    series: ehCardio ? 1 : Number(formData.get("series") || 3),
    repeticoes: ehCardio ? "—" : String(formData.get("repeticoes") || "10-12"),
    carga_inicial: ehCardio ? null : formData.get("cargaInicial") ? Number(formData.get("cargaInicial")) : null,
    descanso_seg: ehCardio ? null : Number(formData.get("descansoSeg") || 60),
    duracao_min: ehCardio && formData.get("duracaoMin") ? Number(formData.get("duracaoMin")) : null,
    intensidade: ehCardio ? String(formData.get("intensidade") || "").trim() || null : null,
    eh_aquecimento: formData.get("ehAquecimento") === "on",
    combina_proximo: formData.get("combinaProximo") === "on",
  };
}
