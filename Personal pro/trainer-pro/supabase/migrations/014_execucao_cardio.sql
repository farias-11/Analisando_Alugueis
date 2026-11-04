-- Cardio (esteira, bike etc.) não tem carga nem repetições: o aluno registra
-- tempo e pace. Colunas próprias em vez de reaproveitar carga/repeticoes —
-- senão o cardio contaminaria o gráfico de evolução de carga, o "Máx." e o
-- histórico de força.
alter table execucoes
  add column if not exists duracao_min numeric(6, 1),
  add column if not exists pace text;
