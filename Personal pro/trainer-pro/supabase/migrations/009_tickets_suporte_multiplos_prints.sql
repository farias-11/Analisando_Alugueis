-- Permite anexar mais de um print por ticket de suporte interno (pedido do
-- personal: "deixar também selecionar mais de uma imagem"). Substitui a
-- coluna única print_url por um array — poucos tickets existem até aqui,
-- então a migração de dados é só embrulhar o valor antigo num array de 1.
alter table tickets_suporte add column print_urls text[] not null default '{}';
update tickets_suporte set print_urls = array[print_url] where print_url is not null;
alter table tickets_suporte drop column print_url;
