# Trainer Pro

PWA para um personal trainer gerenciar treinos, evolução, pagamentos e tickets de
dor/desconforto dos seus alunos. Implementado a partir de `trainer-pro-prompt-claude-code.md`
e `trainer-pro-pacote-completo.pdf`, com 3 correções de design aplicadas durante a
implementação (ver seção "Correções aplicadas" abaixo).

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack) + Tailwind CSS v4
- **Supabase** (Postgres + Auth + Storage), projeto na região São Paulo (`sa-east-1`)
- **Recharts** para gráficos, **lucide-react** para ícones
- PWA completo (manifest + service worker) — instalável via "Adicionar à Tela de Início"

## Setup local

```bash
npm install
cp .env.local.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

O projeto Supabase já usado neste setup está documentado (com credenciais) em
`SECRETS.local.md` — **esse arquivo não é commitado** (está no `.gitignore`).

### Banco de dados

Rode `supabase/schema.sql` inteiro no SQL Editor do Supabase. Ele cria as 18 tabelas,
todas as políticas de Row Level Security, e comenta os buckets de Storage sugeridos.

### Storage

4 buckets, criados via SQL (`insert into storage.buckets ...`, já feito no projeto atual):

| Bucket             | Público? | Motivo                                                  |
| ------------------ | -------- | -------------------------------------------------------- |
| `exercicios`       | sim      | mídia de exercício não é dado sensível                   |
| `avatares`         | sim      | foto de perfil, baixa sensibilidade                       |
| `fotos-progresso`  | **não**  | foto de corpo = dado de saúde (LGPD) — só via signed URL  |
| `tickets`          | **não**  | foto de dor/lesão = dado de saúde (LGPD) — só via signed URL |

Os dois buckets privados usam `createSignedUrl` (`src/lib/supabase/signed-url.ts`),
resolvida no server a partir de registros que já passaram pela RLS da tabela — ou seja,
quem pode ver a URL da foto é sempre quem já podia ver o registro no banco.

### Auth — fluxo de convite do aluno

O aluno nunca se cadastra sozinho. O personal usa "Convidar aluno", que:

1. Cria a linha em `alunos` (status `pendente`).
2. Chama `supabase.auth.admin.inviteUserByEmail` (precisa da `SUPABASE_SERVICE_ROLE_KEY`).

Para o e-mail de convite funcionar, configure em **Auth > Email Templates > Invite user**
o link de confirmação apontando para:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/convite/aceitar
```

Isso já está configurado no projeto atual. Ao clicar, o aluno cai em `/convite/aceitar`,
define a senha e confirma dois consentimentos separados (termos gerais + dados de saúde).

## Correções aplicadas (revisão de design, 2026-08-31)

1. **Dashboard mobile do Personal** unificado com o desktop: bloco "Precisa da sua
   atenção hoje" primeiro, resumo numérico discreto depois — em vez da grade de cards.
2. **Consentimento LGPD** na tela de aceitar convite: bloco separado, desmarcado por
   padrão, específico para dados de saúde (`src/app/(auth)/convite/aceitar/aceitar-form.tsx`).
3. **Botão "Relatar dor/desconforto"** sempre visível na tela de execução do exercício,
   não só como tela avulsa (`.../execucao-client.tsx`).

## Simplificações conscientes (documentadas, não são bugs)

- **Editor de treino**: reordenar aula/exercício é por exclusão + recriação, não
  drag-and-drop (o mockup mostrava um ícone de arrastar).
- **"Aula do dia"**: as aulas do ciclo se repetem em sequência ao longo da semana
  (rotação por dia do ano), não há calendário de dias fixos por aula.
- **Notificações push (Web Push API)**: a tabela `notificacoes` e os gatilhos internos
  existem; falta o service worker de push + a UI de "central de notificações" e o opt-in
  de permissão do navegador.
- **Templates de treino**: criar a partir de um aluno existente funciona; não há editor
  de template do zero sem um aluno de origem.

## Deploy

Vercel (frontend) + Supabase Cloud (dados), como recomendado no planejamento original.
Configure as mesmas variáveis de `.env.local` nas Environment Variables do projeto Vercel,
e ajuste `NEXT_PUBLIC_SITE_URL` para o domínio de produção (usado no link de convite).
