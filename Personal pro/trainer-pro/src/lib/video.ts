function youtubeVideoId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

function driveFileId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

/** Embed pronto pra iframe — aceita link do YouTube ou do Google Drive (o
 * personal geralmente já tem os vídeos guardados lá). O arquivo do Drive
 * precisa estar compartilhado como "Qualquer pessoa com o link" pra abrir
 * embutido — senão o Drive mostra uma tela pedindo acesso dentro do iframe. */
export function videoEmbedUrl(url: string | null): string | null {
  const ytId = youtubeVideoId(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}`;
  const driveId = driveFileId(url);
  if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`;
  return null;
}

/** Miniatura pronta pra capa na biblioteca — YouTube serve um frame do
 * próprio CDN; Drive tem um endpoint de thumbnail que funciona sem
 * autenticação pra arquivo compartilhado publicamente. */
export function videoThumbnailUrl(url: string | null): string | null {
  const ytId = youtubeVideoId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  const driveId = driveFileId(url);
  if (driveId) return `https://drive.google.com/thumbnail?id=${driveId}&sz=w480`;
  return null;
}
