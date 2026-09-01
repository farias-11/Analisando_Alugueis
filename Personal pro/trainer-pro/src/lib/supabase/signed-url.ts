import "server-only";
import { createAdminClient } from "./admin";

/** Gera uma URL assinada de curta duração para um objeto em bucket privado
 * (fotos-progresso, tickets). Quem pode ver o registro que guarda o path já foi
 * decidido pela RLS da tabela — aqui só resolvemos a URL pra exibir a imagem. */
export async function getSignedUrl(bucket: string, path: string | null, expiresInSec = 3600) {
  if (!path) return null;
  const admin = createAdminClient();
  const { data } = await admin.storage.from(bucket).createSignedUrl(path, expiresInSec);
  return data?.signedUrl ?? null;
}
