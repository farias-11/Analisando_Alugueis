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

/** De qual plataforma é o link — decide como a tela de execução mostra o
 * vídeo (embed de verdade pro YouTube; botão "assistir" abrindo em nova aba
 * pro Drive, ver comentário em videoEmbedUrl). */
export function videoPlataforma(url: string | null): "youtube" | "drive" | null {
  if (youtubeVideoId(url)) return "youtube";
  if (driveFileId(url)) return "drive";
  return null;
}

/** Embed pronto pra iframe — só pro YouTube. O Drive TEM um iframe de embed
 * (/preview), mas na prática é ruim de usar dentro do app: sem controles de
 * play/pause de verdade, é o visualizador de documentos do Drive inteiro
 * espremido num quadrado pequeno (confirmado com print real de celular —
 * "bem feio e sem conseguir pausar"). Pra vídeo do Drive, a tela de execução
 * usa videoPlataforma()==="drive" pra mostrar um botão que abre o link
 * original numa aba nova em vez de tentar embutir. */
export function videoEmbedUrl(url: string | null): string | null {
  const ytId = youtubeVideoId(url);
  return ytId ? `https://www.youtube.com/embed/${ytId}` : null;
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
