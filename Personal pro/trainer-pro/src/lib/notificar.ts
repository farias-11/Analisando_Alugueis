import "server-only";
import { createClient } from "@/lib/supabase/server";
import { enviarPush } from "@/lib/push";

interface NotificarInput {
  tipo: string;
  titulo: string;
  mensagem?: string | null;
  link?: string | null;
}

/** Registra a notificação no app (sempre) e dispara um Web Push em paralelo
 * (best-effort — se o destinatário não tiver nenhum dispositivo inscrito, ou
 * push não estiver configurado, isso não afeta o resto da ação). */
export async function notificarPersonal(personalId: string, input: NotificarInput) {
  const supabase = await createClient();
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
  const supabase = await createClient();
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
