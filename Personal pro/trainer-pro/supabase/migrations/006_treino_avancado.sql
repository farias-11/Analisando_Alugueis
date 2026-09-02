-- Editor de treino avançado: editar exercício já adicionado, aquecimento,
-- bi-set/combinação, e exercícios de cardio (duração/intensidade em vez de
-- séries/repetições/carga).

alter table aula_exercicios
  add column eh_aquecimento boolean not null default false,
  add column combina_proximo boolean not null default false,
  add column tipo text not null default 'forca' check (tipo in ('forca', 'cardio')),
  add column duracao_min int,
  add column intensidade text;

alter table template_aula_exercicios
  add column eh_aquecimento boolean not null default false,
  add column combina_proximo boolean not null default false,
  add column tipo text not null default 'forca' check (tipo in ('forca', 'cardio')),
  add column duracao_min int,
  add column intensidade text;
