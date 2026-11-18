import type { MetadataRoute } from "next";
import { APP_BACKGROUND, PWA_ICONS } from "@/lib/pwa";
import en from "@/i18n/dictionaries/en.json";

/**
 * Web app manifest, served at /manifest.webmanifest. The start URL is "/": proxy.ts
 * redirects it to the user's language (ft_lang cookie, then Accept-Language), and the
 * service worker answers it with the offline page when there is no network.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: en.meta.title,
    short_name: "ft_pong",
    description: en.meta.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: APP_BACKGROUND,
    theme_color: APP_BACKGROUND,
    categories: ["games", "entertainment"],
    icons: [
      { src: PWA_ICONS.any192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: PWA_ICONS.any512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: PWA_ICONS.maskable192, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: PWA_ICONS.maskable512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: en.lobby.local, url: "/local", icons: [{ src: PWA_ICONS.any192, sizes: "192x192", type: "image/png" }] },
    ],
  };
}
