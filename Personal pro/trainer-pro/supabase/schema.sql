-- Trainer Pro — schema completo (Postgres / Supabase)
-- Rode este arquivo no SQL Editor do Supabase (projeto criado na região sa-east-1).

create extension if not exists "pgcrypto";

-- =========================================================
-- 1. Personal (dono da conta) e Aluno
-- =========================================================

create table personals (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  whatsapp_numero text not null, -- formato E.164 sem "+" , ex: 5511999999999 (usado no link wa.me)
  email text not null,
  foto_url text,
  created_at timestamptz not null default now()
);

create type status_aluno as enum ('ativo', 'inativo');
create type status_convite as enum ('pendente', 'aceito');
create type status_pagamento as enum ('em_dia', 'atrasado');

create table alunos (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references personals (id) on delete cascade,
  auth_user_id uuid references auth.users (id) on delete set null, -- nulo até o convite ser aceito
  nome text not null,
  email text not null,
  whatsapp text,
  foto_url text,
  objetivo text,
  data_inicio date not null default current_date,
  restricoes text,
  status status_aluno not null default 'ativo',
  status_convite status_convite not null default 'pendente',

  -- avaliações (configuráveis por aluno, começam desligadas)
  anamnese_ativa boolean not null default false,
  bioimpedancia_ativa boolean not null default false,
  bioimpedancia_frequencia_dias int,

  -- treino
  ciclo_duracao_padrao_semanas int not null default 4,

  -- financeiro (denormalizado para listagem rápida; histórico fica em `pagamentos`)
  pagamento_valor numeric(10, 2),
  pagamento_forma text,
  pagamento_vencimento date,
  pagamento_status status_pagamento not null default 'em_dia',

  -- LGPD — consentimento específico para dado de saúde (separado de termos gerais)
  consentimento_saude_aceito boolean not null default false,
  consentimento_saude_data timestamptz,
  consentimento_saude_revogado_em timestamptz,

  ultima_atualizacao_medidas timestamptz,
  pedido_atualizacao_enviado_em timestamptz,
  exclusao_solicitada_em timestamptz,

  anotacoes_internas text,

  created_at timestamptz not null default now()
);

create index idx_alunos_personal on alunos (personal_id);
create index idx_alunos_auth_user on alunos (auth_user_id);
create unique index idx_alunos_email_personal on alunos (personal_id, lower(email));

-- =========================================================
-- 2. Biblioteca de exercícios
-- =========================================================

create type midia_tipo as enum ('youtube', 'upload');

create table exercicios (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references personals (id) on delete cascade,
  nome text not null,
  grupo_muscular text not null,
  instrucoes text,
  midia_tipo midia_tipo not null default 'youtube',
  youtube_url text,
  created_at timestamptz not null default now()
);

create index idx_exercicios_personal on exercicios (personal_id);

-- múltiplos arquivos por exercício (vídeo/gif/imagem), quando midia_tipo = 'upload'
create table exercicio_midias (
  id uuid primary key default gen_random_uuid(),
  exercicio_id uuid not null references exercicios (id) on delete cascade,
  url text not null,
  tipo text not null check (tipo in ('video', 'gif', 'imagem')),
  ordem int not null default 0
);

create index idx_exercicio_midias_exercicio on exercicio_midias (exercicio_id);

-- =========================================================
-- 3. Ciclo de treino → Aula → Aula_exercício → Execução
-- =========================================================

create type status_ciclo as enum ('ativo', 'vencendo', 'vencido');

create table ciclos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos (id) on delete cascade,
  nome text not null default 'Ciclo de treino',
  duracao_semanas int not null default 4,
  data_inicio date not null default current_date,
  data_fim date not null,
  ativo boolean not null default true, -- só um ciclo ativo por aluno por vez
  created_at timestamptz not null default now()
);

create index idx_ciclos_aluno on ciclos (aluno_id);
create unique index idx_ciclos_aluno_ativo on ciclos (aluno_id) where (ativo);

create table aulas (
  id uuid primary key default gen_random_uuid(),
  ciclo_id uuid not null references ciclos (id) on delete cascade,
  nome text not null, -- ex: "Aula 1 - Pernas + Glúteos"
  ordem int not null default 0,
  duracao_estimada_min int,
  dias_semana int[] -- 0=domingo..6=sábado; null = mantém rotação por dia do ano
);

create index idx_aulas_ciclo on aulas (ciclo_id);

create table aula_exercicios (
  id uuid primary key default gen_random_uuid(),
  aula_id uuid not null references aulas (id) on delete cascade,
  exercicio_id uuid not null references exercicios (id) on delete restrict,
  ordem int not null default 0,
  series int not null default 3,
  repeticoes text not null default '10-12', -- texto livre: "10-12", "até a falha" etc.
  carga_inicial numeric(6, 2),
  descanso_seg int default 60
);

create index idx_aula_exercicios_aula on aula_exercicios (aula_id);

create table execucoes (
  id uuid primary key default gen_random_uuid(),
  aula_exercicio_id uuid not null references aula_exercicios (id) on delete cascade,
  aluno_id uuid not null references alunos (id) on delete cascade,
  serie_numero int not null,
  carga numeric(6, 2),
  repeticoes int,
  data timestamptz not null default now()
);

create index idx_execucoes_aula_exercicio on execucoes (aula_exercicio_id);
create index idx_execucoes_aluno on execucoes (aluno_id);

-- =========================================================
-- 4. Templates de treino (reutilizáveis)
-- =========================================================

create table templates (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references personals (id) on delete cascade,
  nome text not null,
  descricao text,
  created_at timestamptz not null default now()
);

create table template_aulas (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates (id) on delete cascade,
  nome text not null,
  ordem int not null default 0,
  duracao_estimada_min int,
  dias_semana int[]
);

create table template_aula_exercicios (
  id uuid primary key default gen_random_uuid(),
  template_aula_id uuid not null references template_aulas (id) on delete cascade,
  exercicio_id uuid not null references exercicios (id) on delete restrict,
  ordem int not null default 0,
  series int not null default 3,
  repeticoes text not null default '10-12',
  carga_inicial numeric(6, 2),
  descanso_seg int default 60
);

-- =========================================================
-- 5. Avaliações — Anamnese e Bioimpedância
-- =========================================================

create table anamneses (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos (id) on delete cascade,
  respostas jsonb not null default '{}'::jsonb,
  concluida boolean not null default false,
  data_preenchimento timestamptz,
  created_at timestamptz not null default now()
);

create unique index idx_anamneses_aluno on anamneses (aluno_id);

create table bioimpedancias (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos (id) on delete cascade,
  data date not null default current_date,
  peso numeric(5, 2),
  percentual_gordura numeric(5, 2),
  massa_magra numeric(5, 2),
  massa_ossea numeric(5, 2),
  agua_corporal numeric(5, 2),
  registrado_por uuid not null references personals (id),
  created_at timestamptz not null default now()
);

create index idx_bioimpedancias_aluno on bioimpedancias (aluno_id, data desc);

-- =========================================================
-- 6. Medidas e fotos de progresso (lançadas pelo aluno)
-- =========================================================

create table medidas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos (id) on delete cascade,
  data date not null default current_date,
  peso numeric(5, 2),
  percentual_gordura numeric(5, 2),
  peito numeric(5, 2),
  cintura numeric(5, 2),
  quadril numeric(5, 2),
  coxa_direita numeric(5, 2),
  coxa_esquerda numeric(5, 2),
  braco numeric(5, 2),
  created_at timestamptz not null default now()
);

create index idx_medidas_aluno on medidas (aluno_id, data desc);

create table fotos_progresso (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos (id) on delete cascade,
  url text not null,
  data date not null default current_date,
  created_at timestamptz not null default now()
);

create index idx_fotos_progresso_aluno on fotos_progresso (aluno_id, data desc);

-- =========================================================
-- 7. Financeiro
-- =========================================================

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos (id) on delete cascade,
  valor numeric(10, 2) not null,
  data_pagamento date not null default current_date,
  forma_pagamento text not null,
  observacao text,
  proximo_vencimento date not null,
  registrado_por uuid not null references personals (id),
  created_at timestamptz not null default now()
);

create index idx_pagamentos_aluno on pagamentos (aluno_id, data_pagamento desc);

-- =========================================================
-- 8. Tickets de dor/desconforto
-- =========================================================

create type status_ticket as enum ('aberto', 'resolvido');

create table tickets (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos (id) on delete cascade,
  aula_exercicio_id uuid references aula_exercicios (id) on delete set null,
  exercicio_nome text not null, -- denormalizado: nome no momento do ticket
  aula_nome text,
  descricao text not null,
  foto_url text,
  status status_ticket not null default 'aberto',
  observacao_resolucao text,
  created_at timestamptz not null default now(),
  resolvido_em timestamptz
);

create index idx_tickets_aluno on tickets (aluno_id);
create index idx_tickets_status on tickets (status);

-- =========================================================
-- 9. Notificações internas
-- =========================================================

create type notificacao_destinatario as enum ('personal', 'aluno');

create table notificacoes (
  id uuid primary key default gen_random_uuid(),
  destinatario_tipo notificacao_destinatario not null,
  personal_id uuid references personals (id) on delete cascade,
  aluno_id uuid references alunos (id) on delete cascade,
  tipo text not null, -- ex: 'pagamento_vencendo', 'ticket_novo', 'treino_vencendo', 'bioimpedancia_pendente', 'anamnese_pendente', 'pedido_atualizacao'
  titulo text not null,
  mensagem text,
  link text,
  lida boolean not null default false,
  created_at timestamptz not null default now(),
  constraint chk_destinatario check (
    (destinatario_tipo = 'personal' and personal_id is not null) or
    (destinatario_tipo = 'aluno' and aluno_id is not null)
  )
);

create index idx_notificacoes_personal on notificacoes (personal_id, lida);
create index idx_notificacoes_aluno on notificacoes (aluno_id, lida);

-- assinaturas de Web Push (uma por dispositivo/navegador instalado)
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  destinatario_tipo notificacao_destinatario not null,
  personal_id uuid references personals (id) on delete cascade,
  aluno_id uuid references alunos (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  constraint chk_push_destinatario check (
    (destinatario_tipo = 'personal' and personal_id is not null) or
    (destinatario_tipo = 'aluno' and aluno_id is not null)
  )
);

-- =========================================================
-- 10. Funções auxiliares e triggers
-- =========================================================

-- recalcula status do ciclo (ativo / vencendo <=7 dias / vencido) sob demanda
create or replace function status_ciclo_calculado(p_data_fim date)
returns status_ciclo
language sql
immutable
as $$
  select case
    when p_data_fim < current_date then 'vencido'::status_ciclo
    when p_data_fim <= current_date + interval '7 days' then 'vencendo'::status_ciclo
    else 'ativo'::status_ciclo
  end;
$$;

-- calcula data_fim automaticamente a partir de data_inicio + duracao_semanas
create or replace function set_ciclo_data_fim()
returns trigger
language plpgsql
as $$
begin
  new.data_fim := new.data_inicio + (new.duracao_semanas * 7);
  return new;
end;
$$;

create trigger trg_ciclo_data_fim
before insert or update of data_inicio, duracao_semanas on ciclos
for each row execute function set_ciclo_data_fim();

-- atualiza pagamento_status do aluno junto com o registro de um novo pagamento
create or replace function registrar_pagamento_aluno()
returns trigger
language plpgsql
as $$
begin
  update alunos
  set pagamento_valor = new.valor,
      pagamento_forma = new.forma_pagamento,
      pagamento_vencimento = new.proximo_vencimento,
      pagamento_status = 'em_dia'
  where id = new.aluno_id;
  return new;
end;
$$;

create trigger trg_registrar_pagamento
after insert on pagamentos
for each row execute function registrar_pagamento_aluno();

-- helper: personal_id do usuário autenticado que é dono do aluno (usado nas policies)
create or replace function auth_personal_id()
returns uuid
language sql
stable
as $$
  select id from personals where id = auth.uid();
$$;

create or replace function auth_aluno_id()
returns uuid
language sql
stable
as $$
  select id from alunos where auth_user_id = auth.uid();
$$;

-- =========================================================
-- 11. Row Level Security
-- =========================================================

alter table personals enable row level security;
alter table alunos enable row level security;
alter table exercicios enable row level security;
alter table exercicio_midias enable row level security;
alter table ciclos enable row level security;
alter table aulas enable row level security;
alter table aula_exercicios enable row level security;
alter table execucoes enable row level security;
alter table templates enable row level security;
alter table template_aulas enable row level security;
alter table template_aula_exercicios enable row level security;
alter table anamneses enable row level security;
alter table bioimpedancias enable row level security;
alter table medidas enable row level security;
alter table fotos_progresso enable row level security;
alter table pagamentos enable row level security;
alter table tickets enable row level security;
alter table notificacoes enable row level security;
alter table push_subscriptions enable row level security;

-- personals: só o próprio personal lê/edita seu perfil
create policy personals_self on personals
  for all using (id = auth.uid()) with check (id = auth.uid());

-- aluno pode ler (só leitura) os dados do próprio personal — necessário pro
-- link do WhatsApp no ticket de dor e pra tela "Ajuda e suporte"
create policy personals_aluno_select on personals
  for select using (id in (select personal_id from alunos where auth_user_id = auth.uid()));

-- alunos: personal tem acesso total aos próprios alunos; aluno lê o próprio registro
create policy alunos_personal_all on alunos
  for all using (personal_id = auth.uid()) with check (personal_id = auth.uid());

create policy alunos_self_select on alunos
  for select using (auth_user_id = auth.uid());

-- exercícios e mídias: escopo do personal; aluno enxerga a biblioteca do próprio personal
create policy exercicios_personal_all on exercicios
  for all using (personal_id = auth.uid()) with check (personal_id = auth.uid());

create policy exercicios_aluno_select on exercicios
  for select using (personal_id in (select personal_id from alunos where auth_user_id = auth.uid()));

create policy exercicio_midias_personal_all on exercicio_midias
  for all using (exercicio_id in (select id from exercicios where personal_id = auth.uid()))
  with check (exercicio_id in (select id from exercicios where personal_id = auth.uid()));

create policy exercicio_midias_aluno_select on exercicio_midias
  for select using (
    exercicio_id in (
      select id from exercicios
      where personal_id in (select personal_id from alunos where auth_user_id = auth.uid())
    )
  );

-- tabelas dependentes de aluno: personal acessa via join; aluno acessa o próprio
create policy ciclos_personal_all on ciclos
  for all using (aluno_id in (select id from alunos where personal_id = auth.uid()))
  with check (aluno_id in (select id from alunos where personal_id = auth.uid()));
create policy ciclos_aluno_select on ciclos
  for select using (aluno_id = auth_aluno_id());

create policy aulas_personal_all on aulas
  for all using (ciclo_id in (select id from ciclos where aluno_id in (select id from alunos where personal_id = auth.uid())))
  with check (ciclo_id in (select id from ciclos where aluno_id in (select id from alunos where personal_id = auth.uid())));
create policy aulas_aluno_select on aulas
  for select using (ciclo_id in (select id from ciclos where aluno_id = auth_aluno_id()));

create policy aula_exercicios_personal_all on aula_exercicios
  for all using (aula_id in (select id from aulas where ciclo_id in (select id from ciclos where aluno_id in (select id from alunos where personal_id = auth.uid()))))
  with check (aula_id in (select id from aulas where ciclo_id in (select id from ciclos where aluno_id in (select id from alunos where personal_id = auth.uid()))));
create policy aula_exercicios_aluno_select on aula_exercicios
  for select using (aula_id in (select id from aulas where ciclo_id in (select id from ciclos where aluno_id = auth_aluno_id())));

create policy execucoes_personal_select on execucoes
  for select using (aluno_id in (select id from alunos where personal_id = auth.uid()));
create policy execucoes_aluno_all on execucoes
  for all using (aluno_id = auth_aluno_id()) with check (aluno_id = auth_aluno_id());

-- templates: só o personal
create policy templates_personal_all on templates
  for all using (personal_id = auth.uid()) with check (personal_id = auth.uid());
create policy template_aulas_personal_all on template_aulas
  for all using (template_id in (select id from templates where personal_id = auth.uid()))
  with check (template_id in (select id from templates where personal_id = auth.uid()));
create policy template_aula_exercicios_personal_all on template_aula_exercicios
  for all using (template_aula_id in (select id from template_aulas where template_id in (select id from templates where personal_id = auth.uid())))
  with check (template_aula_id in (select id from template_aulas where template_id in (select id from templates where personal_id = auth.uid())));

-- anamneses: personal lê; aluno lê/preenche a própria
create policy anamneses_personal_select on anamneses
  for select using (aluno_id in (select id from alunos where personal_id = auth.uid()));
create policy anamneses_aluno_all on anamneses
  for all using (aluno_id = auth_aluno_id()) with check (aluno_id = auth_aluno_id());

-- bioimpedâncias: só o personal lança e lê; aluno só lê (somente leitura)
create policy bioimpedancias_personal_all on bioimpedancias
  for all using (aluno_id in (select id from alunos where personal_id = auth.uid()))
  with check (aluno_id in (select id from alunos where personal_id = auth.uid()));
create policy bioimpedancias_aluno_select on bioimpedancias
  for select using (aluno_id = auth_aluno_id());

-- medidas e fotos: aluno lança as próprias; personal lê
create policy medidas_personal_select on medidas
  for select using (aluno_id in (select id from alunos where personal_id = auth.uid()));
create policy medidas_aluno_all on medidas
  for all using (aluno_id = auth_aluno_id()) with check (aluno_id = auth_aluno_id());

create policy fotos_personal_select on fotos_progresso
  for select using (aluno_id in (select id from alunos where personal_id = auth.uid()));
create policy fotos_aluno_all on fotos_progresso
  for all using (aluno_id = auth_aluno_id()) with check (aluno_id = auth_aluno_id());

-- pagamentos: só o personal (controle manual)
create policy pagamentos_personal_all on pagamentos
  for all using (aluno_id in (select id from alunos where personal_id = auth.uid()))
  with check (aluno_id in (select id from alunos where personal_id = auth.uid()));

-- tickets: aluno cria/lê os próprios; personal lê/resolve os dos seus alunos
create policy tickets_personal_all on tickets
  for all using (aluno_id in (select id from alunos where personal_id = auth.uid()))
  with check (aluno_id in (select id from alunos where personal_id = auth.uid()));
create policy tickets_aluno_select_insert on tickets
  for select using (aluno_id = auth_aluno_id());
create policy tickets_aluno_insert on tickets
  for insert with check (aluno_id = auth_aluno_id());

-- notificações: cada um lê e marca como lida as próprias
create policy notificacoes_personal on notificacoes
  for all using (destinatario_tipo = 'personal' and personal_id = auth.uid())
  with check (destinatario_tipo = 'personal' and personal_id = auth.uid());
create policy notificacoes_aluno on notificacoes
  for all using (destinatario_tipo = 'aluno' and aluno_id = auth_aluno_id())
  with check (destinatario_tipo = 'aluno' and aluno_id = auth_aluno_id());

create policy push_subscriptions_personal on push_subscriptions
  for all using (destinatario_tipo = 'personal' and personal_id = auth.uid())
  with check (destinatario_tipo = 'personal' and personal_id = auth.uid());
create policy push_subscriptions_aluno on push_subscriptions
  for all using (destinatario_tipo = 'aluno' and aluno_id = auth_aluno_id())
  with check (destinatario_tipo = 'aluno' and aluno_id = auth_aluno_id());

-- =========================================================
-- 12. Storage buckets (rode também no painel Storage, ou via SQL se preferir)
-- =========================================================
-- Buckets sugeridos (privados): 'exercicios', 'fotos-progresso', 'tickets', 'avatares'
-- Políticas de storage devem espelhar a mesma lógica: personal acessa arquivos dos
-- próprios alunos/exercícios; aluno acessa só os próprios arquivos. Configure via
-- Storage > Policies no painel do Supabase, usando o mesmo padrão de auth.uid().
