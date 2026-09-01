"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAluno, requirePersonal } from "@/lib/data/current-user";

interface SubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function salvarSubscricaoPushAluno(sub: SubscriptionJSON) {
  const { aluno } = await requireAluno();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").upsert(
    {
      destinatario_tipo: "aluno",
      aluno_id: aluno.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" }
  );
}

export async function salvarSubscricaoPushPersonal(sub: SubscriptionJSON) {
  const { personal } = await requirePersonal();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").upsert(
    {
      destinatario_tipo: "personal",
      personal_id: personal.id,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" }
  );
}

export async function removerSubscricaoPush(endpoint: string) {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}
