-- Planos de pagamento: hoje o valor/vencimento do aluno era digitado solto
-- a cada pagamento, com recorrência sempre fixa em 30 dias. Um "plano"
-- formaliza isso (nome, valor, recorrência em meses, dia de vencimento) pra
-- o personal reutilizar entre alunos e não perder o "combinado" de cada um.
create table planos (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references personals (id) on delete cascade,
  nome text not null,
  valor numeric(10, 2) not null default 0,
  recorrencia_meses int not null default 1 check (recorrencia_meses in (1, 2, 3, 4, 5, 6, 12)),
  dia_pagamento int check (dia_pagamento between 1 and 31),
  created_at timestamptz not null default now()
);

create index idx_planos_personal on planos (personal_id);

alter table planos enable row level security;

create policy planos_personal_all on planos
  for all
  using (personal_id = auth.uid())
  with check (personal_id = auth.uid());

alter table alunos add column plano_id uuid references planos (id) on delete set null;

-- todo personal já existente ganha um plano "Gratuito" (valor 0) pronto pra
-- usar nos alunos que ainda não têm cobrança definida — evita que a lista
-- de planos comece vazia e sem opção nenhuma pro personal escolher.
insert into planos (personal_id, nome, valor, recorrencia_meses)
select id, 'Gratuito', 0, 1 from personals;
