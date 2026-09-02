-- Respostas rápidas em tickets de dor (handoff, seção 3.4): conjunto de
-- respostas pré-configuradas e editáveis que o personal escolhe e ajusta
-- antes de enviar, em vez de redigitar a mesma orientação sempre.
create table respostas_rapidas (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references personals (id) on delete cascade,
  texto text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_respostas_rapidas_personal on respostas_rapidas (personal_id, ordem);

alter table respostas_rapidas enable row level security;

create policy respostas_rapidas_personal_all on respostas_rapidas
  for all
  using (personal_id = auth.uid())
  with check (personal_id = auth.uid());
