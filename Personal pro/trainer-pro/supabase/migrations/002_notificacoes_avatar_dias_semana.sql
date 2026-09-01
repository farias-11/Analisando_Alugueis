-- Migração incremental: foto de perfil, aula vinculada a dias da semana,
-- e assinaturas de push notification. Rode no SQL Editor do Supabase.

alter table personals add column if not exists foto_url text;
alter table aulas add column if not exists dias_semana int[]; -- 0=domingo .. 6=sábado; null = mantém rotação por dia do ano
alter table template_aulas add column if not exists dias_semana int[];

create table if not exists push_subscriptions (
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

alter table push_subscriptions enable row level security;

create policy push_subscriptions_personal on push_subscriptions
  for all using (destinatario_tipo = 'personal' and personal_id = auth.uid())
  with check (destinatario_tipo = 'personal' and personal_id = auth.uid());
create policy push_subscriptions_aluno on push_subscriptions
  for all using (destinatario_tipo = 'aluno' and aluno_id = auth_aluno_id())
  with check (destinatario_tipo = 'aluno' and aluno_id = auth_aluno_id());
