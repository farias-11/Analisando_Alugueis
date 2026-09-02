import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // padrão do Next é 1MB — foto de celular real (avatar, exercício, progresso,
    // tickets) passa disso fácil. Sem isso, todo upload de imagem do app falha
    // com erro 500 genérico assim que o arquivo é "grande" de verdade. 25mb dá
    // folga pra quem anexa várias fotos de uma vez no ticket de suporte.
    serverActions: {
      bodySizeLimit: "25mb",
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
    ],
  },
};

export default nextConfig;
