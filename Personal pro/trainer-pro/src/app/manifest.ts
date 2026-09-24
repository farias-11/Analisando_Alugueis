import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Duo Flow",
    short_name: "Duo Flow",
    description: "Conexão que gera evolução — treinos, avaliações e pagamentos entre personal e aluno.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f7",
    theme_color: "#0f52ba",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
