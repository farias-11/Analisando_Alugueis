-- Marca máxima registrada à mão pelo personal (ex: aluno novo que já treinava
-- e tem as melhores cargas anotadas de antes do app). Antes o "Máx." só existia
-- a partir de execuções de verdade, e a única forma de simular um máximo
-- anterior era inserir execuções falsas — que contaminavam o gráfico de
-- evolução de carga ("carga caiu X%" quando o aluno treinasse abaixo do
-- máximo), o histórico e o "dias desde o último treino". Esta tabela fica de
-- fora de tudo isso: só alimenta a etiqueta "Máx." na tela do exercício.
create table marcas_maximas (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references alunos (id) on delete cascade,
  exercicio_id uuid not null references exercicios (id) on delete cascade,
  carga numeric(6, 2) not null,
  repeticoes int,
  created_at timestamptz not null default now(),
  unique (aluno_id, exercicio_id)
);

create index idx_marcas_maximas_aluno on marcas_maximas (aluno_id);

alter table marcas_maximas enable row level security;

create policy marcas_maximas_personal_all on marcas_maximas
  for all
  using (aluno_id in (select id from alunos where personal_id = auth.uid()))
  with check (aluno_id in (select id from alunos where personal_id = auth.uid()));

create policy marcas_maximas_aluno_select on marcas_maximas
  for select using (aluno_id = auth_aluno_id());
