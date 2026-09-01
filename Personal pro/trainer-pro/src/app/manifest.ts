import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Trainer Pro",
    short_name: "Trainer Pro",
    description: "Gestão de treinos, evolução e pagamentos para personal trainers.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f3",
    theme_color: "#e15726",
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
