import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarPush } from "@/lib/push";
import type { NotificacoesPreferencias } from "@/lib/types";

interface NotificarInput {
  tipo: string;
  titulo: string;
  mensagem?: string | null;
  link?: string | null;
}

// preferências são "opt-out": ausência de chave = tipo ligado por padrão.
function tipoHabilitado(prefs: NotificacoesPreferencias | null | undefined, tipo: string) {
  return prefs?.[tipo] !== false;
}

/** Registra a notificação no app (sempre) e dispara um Web Push em paralelo
 * (best-effort — se o destinatário não tiver nenhum dispositivo inscrito, ou
 * push não estiver configurado, isso não afeta o resto da ação). Respeita as
 * preferências granulares por tipo (item B13) — se o destinatário desligou
 * esse tipo, não registra nem envia nada.
 *
 * Usa o cliente admin (service role) de propósito: quem CHAMA isso quase
 * sempre é a sessão da OUTRA pessoa (ex.: o aluno relatando dor precisa
 * notificar o personal) — nenhuma policy de RLS libera alguém inserir uma
 * notificação endereçada a outra conta, então com o client normal o insert
 * falhava em silêncio (sem o insert dar erro na UI, mas a notificação nunca
 * chegava). */
export async function notificarPersonal(personalId: string, input: NotificarInput) {
  const supabase = createAdminClient();

  const { data: personal } = await supabase
    .from("personals")
    .select("notificacoes_preferencias")
    .eq("id", personalId)
    .maybeSingle();
  if (!tipoHabilitado(personal?.notificacoes_preferencias, input.tipo)) return;

  await supabase.from("notificacoes").insert({
    destinatario_tipo: "personal",
    personal_id: personalId,
    tipo: input.tipo,
    titulo: input.titulo,
    mensagem: input.mensagem ?? null,
    link: input.link ?? null,
  });

  await enviarPush(
    { tipo: "personal", personalId },
    { title: input.titulo, body: input.mensagem ?? undefined, url: input.link ?? undefined }
  );
}

export async function notificarAluno(alunoId: string, input: NotificarInput) {
  const supabase = createAdminClient();

  const { data: aluno } = await supabase
    .from("alunos")
    .select("notificacoes_preferencias")
    .eq("id", alunoId)
    .maybeSingle();
  if (!tipoHabilitado(aluno?.notificacoes_preferencias, input.tipo)) return;

  await supabase.from("notificacoes").insert({
    destinatario_tipo: "aluno",
    aluno_id: alunoId,
    tipo: input.tipo,
    titulo: input.titulo,
    mensagem: input.mensagem ?? null,
    link: input.link ?? null,
  });

  await enviarPush(
    { tipo: "aluno", alunoId },
    { title: input.titulo, body: input.mensagem ?? undefined, url: input.link ?? undefined }
  );
}
