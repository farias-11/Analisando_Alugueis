-- Corrige bug crítico: aluno não conseguia ler o WhatsApp do próprio personal
-- via RLS, o que quebrava silenciosamente o botão "Relatar dor" (nunca abria
-- o WhatsApp de verdade). Descoberto e corrigido em 2026-09-01.

create policy personals_aluno_select on personals
  for select using (id in (select personal_id from alunos where auth_user_id = auth.uid()));
