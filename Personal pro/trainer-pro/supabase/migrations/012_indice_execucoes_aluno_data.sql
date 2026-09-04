-- execucoes é a tabela que mais cresce no sistema (uma linha por série, por
-- treino, pra sempre) — hoje só tem indice em aluno_id sozinho. Toda consulta
-- de aderência/evolução (dashboard, resumo de evolução, insight, gráficos)
-- filtra por aluno_id + intervalo de data ao mesmo tempo; sem esse par junto
-- no índice, cada uma dessas consultas fica mais lenta conforme o histórico
-- do aluno cresce (anos de treino acumulado), mesmo já sendo bem limitadas
-- por janela de tempo.
create index if not exists idx_execucoes_aluno_data on execucoes (aluno_id, data desc);
