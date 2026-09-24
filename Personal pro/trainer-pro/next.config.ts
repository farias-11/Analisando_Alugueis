import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // ffmpeg-static só exporta o CAMINHO do binário (path.join(__dirname, ...))
  // — empacotar isso via webpack/turbopack quebraria essa resolução. Usa
  // require nativo do Node em vez disso, e garante que o binário (sibling
  // file, não importado via JS) entra no rastreamento de arquivos da function
  // serverless. Ver src/lib/video-faststart.ts.
  serverExternalPackages: ["ffmpeg-static"],
  experimental: {
    // padrão do Next é 1MB — foto/vídeo de celular real (avatar, exercício,
    // progresso, tickets) passa disso fácil. Sem isso, todo upload de arquivo
    // do app falha com erro 500 genérico assim que o arquivo é "grande" de
    // verdade. 100mb dá folga real pra vídeo de exercício gravado no celular
    // (visto na prática: 37MB só de um clipe curto) — 25mb já não bastava nem
    // pra isso, sobrava só pra foto.
    serverActions: {
      bodySizeLimit: "100mb",
    },
    // desde o Next 15 o cache de prefetch de rota dinâmica é 0s por padrão —
    // como quase toda rota nossa é dinâmica (usa cookies/sessão) e tem várias
    // com loading.tsx (prefetchable), o menu inferior/lateral reprefetchava os
    // mesmos links sem parar, sem nunca considerar o resultado "fresco",
    // enchendo a rede de requisições concorrentes e travando a navegação real.
    staleTimes: {
      dynamic: 30,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
      // capa de exercício na biblioteca, quando o personal só colou um link
      // do YouTube ou do Drive (sem upload próprio) — ver videoThumbnailUrl().
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
    ],
  },
};

export default nextConfig;
