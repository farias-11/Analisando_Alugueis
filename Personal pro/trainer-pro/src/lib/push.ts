import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

let configurado = false;
function garantirConfigurado() {
  if (configurado) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contato@example.com";
  if (!publicKey || !privateKey) return; // push é opcional — segue sem quebrar o app
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configurado = true;
}

/** Envia um Web Push pra todos os dispositivos inscritos desse destinatário.
 * Silencioso em falhas individuais (endpoint expirado etc.) — remove a
 * assinatura quebrada e segue para as próximas. Nunca lança erro pro chamador:
 * notificação no app já foi salva antes disso, push é só um extra. */
export async function enviarPush(
  destinatario: { tipo: "personal"; personalId: string } | { tipo: "aluno"; alunoId: string },
  payload: { title: string; body?: string; url?: string }
) {
  garantirConfigurado();
  if (!configurado) return;

  const admin = createAdminClient();
  let query = admin.from("push_subscriptions").select("*").eq("destinatario_tipo", destinatario.tipo);
  query =
    destinatario.tipo === "personal"
      ? query.eq("personal_id", destinatario.personalId)
      : query.eq("aluno_id", destinatario.alunoId);

  const { data: subs } = await query;
  if (!subs || subs.length === 0) return;

  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    })
  );
}
