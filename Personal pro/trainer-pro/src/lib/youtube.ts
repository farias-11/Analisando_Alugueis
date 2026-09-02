function youtubeVideoId(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

export function youtubeEmbedUrl(url: string | null): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}` : null;
}

/** Miniatura pronta do próprio YouTube — sem precisar gerar/armazenar nada,
 * o CDN deles já serve um frame do vídeo em vários tamanhos por padrão. */
export function youtubeThumbnailUrl(url: string | null): string | null {
  const id = youtubeVideoId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}
