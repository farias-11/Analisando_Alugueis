-- Fotos de progresso estruturadas (item do feedback pós-uso):
-- personal escolhe quais ângulos quer acompanhar, aluno preenche cada bloco.

alter table alunos add column fotos_solicitadas jsonb not null default '[]'::jsonb;
alter table fotos_progresso add column angulo text;

create index idx_fotos_progresso_angulo on fotos_progresso (aluno_id, angulo, data desc);
