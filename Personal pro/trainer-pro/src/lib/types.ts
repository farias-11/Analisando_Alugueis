export type StatusAluno = "ativo" | "inativo";
export type StatusConvite = "pendente" | "aceito";
export type StatusPagamento = "em_dia" | "atrasado";
export type StatusCiclo = "ativo" | "vencendo" | "vencido";
export type StatusTicket = "aberto" | "resolvido";
export type MidiaTipo = "youtube" | "upload";
export type CategoriaTicketSuporte = "bug" | "sugestao";
export type StatusTicketSuporte = "aberto" | "resolvido";

export interface NotificacoesPreferencias {
  [tipo: string]: boolean;
}

export interface Personal {
  id: string;
  nome: string;
  whatsapp_numero: string;
  email: string;
  foto_url: string | null;
  notificacoes_preferencias: NotificacoesPreferencias;
  resumo_diario_ativo: boolean;
  created_at: string;
}

export interface Admin {
  id: string;
  nome: string;
  created_at: string;
}

export interface Aluno {
  id: string;
  personal_id: string;
  auth_user_id: string | null;
  nome: string;
  email: string;
  whatsapp: string | null;
  foto_url: string | null;
  objetivo: string | null;
  data_inicio: string;
  restricoes: string | null;
  status: StatusAluno;
  status_convite: StatusConvite;
  anamnese_ativa: boolean;
  bioimpedancia_ativa: boolean;
  bioimpedancia_frequencia_dias: number | null;
  ciclo_duracao_padrao_semanas: number;
  pagamento_valor: number | null;
  pagamento_forma: string | null;
  pagamento_vencimento: string | null;
  pagamento_status: StatusPagamento;
  consentimento_saude_aceito: boolean;
  consentimento_saude_data: string | null;
  consentimento_saude_revogado_em: string | null;
  ultima_atualizacao_medidas: string | null;
  pedido_atualizacao_enviado_em: string | null;
  exclusao_solicitada_em: string | null;
  anotacoes_internas: string | null;
  notificacoes_preferencias: NotificacoesPreferencias;
  convite_enviado_em: string;
  fotos_solicitadas: string[];
  created_at: string;
}

export interface Exercicio {
  id: string;
  personal_id: string;
  nome: string;
  grupo_muscular: string;
  instrucoes: string | null;
  midia_tipo: MidiaTipo;
  youtube_url: string | null;
  created_at: string;
}

export interface ExercicioMidia {
  id: string;
  exercicio_id: string;
  url: string;
  tipo: "video" | "gif" | "imagem";
  ordem: number;
}

export interface Ciclo {
  id: string;
  aluno_id: string;
  nome: string;
  duracao_semanas: number;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
  origem_template_id: string | null;
  origem_aluno_id: string | null;
  created_at: string;
}

export interface Aula {
  id: string;
  ciclo_id: string;
  nome: string;
  ordem: number;
  duracao_estimada_min: number | null;
  dias_semana: number[] | null;
}

export interface AulaExercicio {
  id: string;
  aula_id: string;
  exercicio_id: string;
  ordem: number;
  series: number;
  repeticoes: string;
  carga_inicial: number | null;
  descanso_seg: number | null;
  eh_aquecimento: boolean;
  combina_proximo: boolean;
  tipo: "forca" | "cardio";
  duracao_min: number | null;
  intensidade: string | null;
}

export interface Execucao {
  id: string;
  aula_exercicio_id: string;
  aluno_id: string;
  serie_numero: number;
  carga: number | null;
  repeticoes: number | null;
  data: string;
}

export interface Template {
  id: string;
  personal_id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
}

export interface TemplateAula {
  id: string;
  template_id: string;
  nome: string;
  ordem: number;
  duracao_estimada_min: number | null;
  dias_semana: number[] | null;
}

export interface TemplateAulaExercicio {
  id: string;
  template_aula_id: string;
  exercicio_id: string;
  ordem: number;
  series: number;
  repeticoes: string;
  carga_inicial: number | null;
  descanso_seg: number | null;
  eh_aquecimento: boolean;
  combina_proximo: boolean;
  tipo: "forca" | "cardio";
  duracao_min: number | null;
  intensidade: string | null;
}

export interface Anamnese {
  id: string;
  aluno_id: string;
  respostas: Record<string, unknown>;
  concluida: boolean;
  data_preenchimento: string | null;
  created_at: string;
}

export interface Bioimpedancia {
  id: string;
  aluno_id: string;
  data: string;
  peso: number | null;
  percentual_gordura: number | null;
  massa_magra: number | null;
  massa_ossea: number | null;
  agua_corporal: number | null;
  registrado_por: string;
  created_at: string;
}

export interface Medida {
  id: string;
  aluno_id: string;
  data: string;
  peso: number | null;
  percentual_gordura: number | null;
  peito: number | null;
  cintura: number | null;
  quadril: number | null;
  coxa_direita: number | null;
  coxa_esquerda: number | null;
  braco: number | null;
  created_at: string;
}

export interface FotoProgresso {
  id: string;
  aluno_id: string;
  url: string;
  data: string;
  angulo: string | null;
  created_at: string;
}

export interface Pagamento {
  id: string;
  aluno_id: string;
  valor: number;
  data_pagamento: string;
  forma_pagamento: string;
  observacao: string | null;
  proximo_vencimento: string;
  registrado_por: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  aluno_id: string;
  aula_exercicio_id: string | null;
  exercicio_nome: string;
  aula_nome: string | null;
  descricao: string;
  foto_url: string | null;
  status: StatusTicket;
  observacao_resolucao: string | null;
  created_at: string;
  resolvido_em: string | null;
}

export interface RespostaRapida {
  id: string;
  personal_id: string;
  texto: string;
  ordem: number;
  created_at: string;
}

export interface TicketSuporte {
  id: string;
  autor_tipo: "personal" | "aluno";
  personal_id: string | null;
  aluno_id: string | null;
  categoria: CategoriaTicketSuporte;
  descricao: string;
  print_urls: string[];
  status: StatusTicketSuporte;
  resposta_admin: string | null;
  created_at: string;
  resolvido_em: string | null;
}

export interface Notificacao {
  id: string;
  destinatario_tipo: "personal" | "aluno";
  personal_id: string | null;
  aluno_id: string | null;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  destinatario_tipo: "personal" | "aluno";
  personal_id: string | null;
  aluno_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export const ANAMNESE_SECOES = [
  "dados_gerais",
  "historico_saude",
  "lesoes_dores",
  "habitos",
  "objetivos",
  "observacoes",
] as const;

export type AnamneseSecao = (typeof ANAMNESE_SECOES)[number];
