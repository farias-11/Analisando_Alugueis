-- Rodada 1 de atualizações pós-lançamento
-- Grupo A: role admin + tickets de suporte internos
-- Grupo B/C: rastreabilidade de templates, preferências de notificação, seed de biblioteca

-- =========================================================
-- 1. Role admin
-- =========================================================

create table admins (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

create policy admins_self on admins
  for select using (id = auth.uid());

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where id = auth.uid());
$$;

-- =========================================================
-- 2. Tickets de suporte (bug/sugestão) — diferente do ticket de dor
-- =========================================================

create type categoria_ticket_suporte as enum ('bug', 'sugestao');
create type status_ticket_suporte as enum ('aberto', 'resolvido');

create table tickets_suporte (
  id uuid primary key default gen_random_uuid(),
  autor_tipo notificacao_destinatario not null,
  personal_id uuid references personals (id) on delete cascade,
  aluno_id uuid references alunos (id) on delete cascade,
  categoria categoria_ticket_suporte not null default 'bug',
  descricao text not null,
  print_url text,
  status status_ticket_suporte not null default 'aberto',
  resposta_admin text,
  created_at timestamptz not null default now(),
  resolvido_em timestamptz,
  constraint chk_autor_ticket_suporte check (
    (autor_tipo = 'personal' and personal_id is not null) or
    (autor_tipo = 'aluno' and aluno_id is not null)
  )
);

create index idx_tickets_suporte_status on tickets_suporte (status);

alter table tickets_suporte enable row level security;

create policy tickets_suporte_autor_select on tickets_suporte
  for select using (
    (autor_tipo = 'personal' and personal_id = auth.uid()) or
    (autor_tipo = 'aluno' and aluno_id = auth_aluno_id())
  );

create policy tickets_suporte_autor_insert on tickets_suporte
  for insert with check (
    (autor_tipo = 'personal' and personal_id = auth.uid()) or
    (autor_tipo = 'aluno' and aluno_id = auth_aluno_id())
  );

create policy tickets_suporte_admin_all on tickets_suporte
  for all using (is_admin()) with check (is_admin());

-- =========================================================
-- 3. Rastreabilidade de templates (item B8)
-- =========================================================

alter table ciclos add column origem_template_id uuid references templates (id) on delete set null;
alter table ciclos add column origem_aluno_id uuid references alunos (id) on delete set null;

-- =========================================================
-- 4. Preferências granulares de notificação (item B13)
-- =========================================================

alter table personals add column notificacoes_preferencias jsonb not null default '{}'::jsonb;
alter table alunos add column notificacoes_preferencias jsonb not null default '{}'::jsonb;

-- =========================================================
-- 5. Onboarding — biblioteca inicial de exercícios (item B12)
-- =========================================================

create or replace function seed_biblioteca_padrao()
returns trigger
language plpgsql
as $$
begin
  insert into exercicios (personal_id, nome, grupo_muscular, midia_tipo) values
    (new.id, 'Agachamento Livre', 'Pernas', 'youtube'),
    (new.id, 'Leg Press 45°', 'Pernas', 'youtube'),
    (new.id, 'Cadeira Extensora', 'Pernas', 'youtube'),
    (new.id, 'Mesa Flexora', 'Pernas', 'youtube'),
    (new.id, 'Stiff', 'Posterior', 'youtube'),
    (new.id, 'Elevação Pélvica', 'Glúteos', 'youtube'),
    (new.id, 'Supino Reto', 'Peito', 'youtube'),
    (new.id, 'Supino Inclinado', 'Peito', 'youtube'),
    (new.id, 'Crucifixo', 'Peito', 'youtube'),
    (new.id, 'Puxada Frente', 'Costas', 'youtube'),
    (new.id, 'Remada Curvada', 'Costas', 'youtube'),
    (new.id, 'Remada Baixa', 'Costas', 'youtube'),
    (new.id, 'Desenvolvimento Ombros', 'Ombros', 'youtube'),
    (new.id, 'Elevação Lateral', 'Ombros', 'youtube'),
    (new.id, 'Rosca Direta', 'Bíceps', 'youtube'),
    (new.id, 'Rosca Alternada', 'Bíceps', 'youtube'),
    (new.id, 'Tríceps Corda', 'Tríceps', 'youtube'),
    (new.id, 'Tríceps Testa', 'Tríceps', 'youtube'),
    (new.id, 'Abdominal Supra', 'Abdômen', 'youtube'),
    (new.id, 'Prancha', 'Abdômen', 'youtube');
  return new;
end;
$$;

create trigger trg_seed_biblioteca_padrao
after insert on personals
for each row execute function seed_biblioteca_padrao();

-- =========================================================
-- 6. execucoes — permitir upsert por série/dia (item C14/C15)
-- =========================================================

alter table execucoes add column dia date not null generated always as ((data at time zone 'utc')::date) stored;
create unique index idx_execucoes_serie_unica on execucoes (aula_exercicio_id, aluno_id, serie_numero, dia);

-- =========================================================
-- 7. Convite pendente — data do último envio (item B9)
-- =========================================================
alter table alunos add column convite_enviado_em timestamptz not null default now();

-- =========================================================
-- 8. Revogação de consentimento de saúde (item B10) — personal perde LEITURA
-- de anamnese/medidas/fotos enquanto o aluno não consentir de novo. Conta e
-- treino continuam normais (personal ainda monta/edita treino livremente).
-- =========================================================

drop policy anamneses_personal_select on anamneses;
create policy anamneses_personal_select on anamneses
  for select using (
    aluno_id in (
      select id from alunos where personal_id = auth.uid() and consentimento_saude_aceito = true
    )
  );

drop policy medidas_personal_select on medidas;
create policy medidas_personal_select on medidas
  for select using (
    aluno_id in (
      select id from alunos where personal_id = auth.uid() and consentimento_saude_aceito = true
    )
  );

drop policy fotos_personal_select on fotos_progresso;
create policy fotos_personal_select on fotos_progresso
  for select using (
    aluno_id in (
      select id from alunos where personal_id = auth.uid() and consentimento_saude_aceito = true
    )
  );

-- =========================================================
-- 9. Realtime — sincronização desktop/mobile no editor de treino (item C22)
-- =========================================================
alter publication supabase_realtime add table aulas;
alter publication supabase_realtime add table aula_exercicios;
