// Constantes compartilhadas entre Server Actions ("use server" — só pode
// exportar funções async, não valores) e os componentes que as usam.

export const CONVITE_VALIDADE_DIAS = 7;
export const PRAZO_EXCLUSAO_DIAS = 30;

export const TIPOS_NOTIFICACAO_PERSONAL = [
  { tipo: "ticket_novo", label: "Novo relato de dor de um aluno" },
  { tipo: "consentimento_revogado", label: "Aluno revogou consentimento de dados de saúde" },
  { tipo: "exclusao_solicitada", label: "Aluno pediu exclusão da conta" },
] as const;

export const TIPOS_NOTIFICACAO_ALUNO = [
  { tipo: "pedido_atualizacao", label: "Lembrete pra atualizar medidas" },
  { tipo: "ticket_resolvido", label: "Resposta a um relato de dor" },
  { tipo: "lembrete_cobranca", label: "Lembrete de mensalidade perto do vencimento" },
] as const;

export const ANGULOS_FOTO_DISPONIVEIS = ["Frente", "Lado direito", "Lado esquerdo", "Costas"] as const;

// Peso é sempre pedido (não entra nessa lista) — o resto é opt-in por aluno,
// alguns só querem se pesar e mais nada.
export const CAMPOS_MEDIDA_DISPONIVEIS = [
  { campo: "percentual_gordura", label: "% de gordura" },
  { campo: "peito", label: "Peito" },
  { campo: "cintura", label: "Cintura" },
  { campo: "quadril", label: "Quadril" },
  { campo: "braco", label: "Braço" },
  { campo: "coxa_direita", label: "Coxa direita" },
  { campo: "coxa_esquerda", label: "Coxa esquerda" },
] as const;
