import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Relue — Inteligência de Licitações de TI",
    short_name: "Relue",
    description: "Inteligência de mercado sobre licitações públicas de TI (base PNCP).",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#09090c",
    theme_color: "#09090c",
    lang: "pt-BR",
    dir: "ltr",
    categories: ["business", "productivity", "finance"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
