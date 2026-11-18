import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Masam",
    short_name: "Masam",
    description: "Pano, görevler ve notlar tek çatı altında.",
    lang: "tr",
    start_url: "/gorevler",
    scope: "/",
    display: "standalone",
    background_color: "#f3f5f8",
    theme_color: "#0e7c6b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Görevler", url: "/gorevler", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Notlarım", url: "/toplanti", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Projeler", url: "/projeler", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
