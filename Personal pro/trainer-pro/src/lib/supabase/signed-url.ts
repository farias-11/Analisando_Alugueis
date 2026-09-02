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

/** Igual getSignedUrl, mas assina vários objetos numa única chamada — quando
 * a tela tem muitas fotos (galeria, comparador), evita uma ida à rede por
 * foto e faz só uma. Retorna um Map path -> URL assinada (paths inválidos
 * simplesmente não entram no Map). */
export async function getSignedUrls(bucket: string, paths: string[], expiresInSec = 3600) {
  const unicos = Array.from(new Set(paths));
  if (unicos.length === 0) return new Map<string, string>();
  const admin = createAdminClient();
  const { data } = await admin.storage.from(bucket).createSignedUrls(unicos, expiresInSec);
  const mapa = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) mapa.set(item.path, item.signedUrl);
  }
  return mapa;
}
