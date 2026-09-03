-- Quais campos de medida (além do peso, que é sempre pedido) o personal
-- quer acompanhar desse aluno especificamente — mesmo padrão de
-- fotos_solicitadas. Default vazio: só peso, por padrão (handoff).
alter table alunos add column medidas_solicitadas jsonb not null default '[]'::jsonb;
