-- Resumo diário (handoff, seção 4 — Configurações): opção opt-in de receber
-- um resumo do dia (radar de prioridades, ciclos vencendo, financeiro) como
-- notificação no app + Web Push, via Vercel Cron. Coluna separada das
-- preferências por tipo de evento (notificacoes_preferencias) porque aqui o
-- padrão tem que ser desligado — é uma notificação nova que ninguém pediu
-- ainda, não um evento que já existia e passou a poder ser desligado.
alter table personals add column resumo_diario_ativo boolean not null default false;
