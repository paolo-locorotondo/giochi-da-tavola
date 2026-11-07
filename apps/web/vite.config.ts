import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json";

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // In sviluppo (pnpm dev) il sito è raggiungibile anche dal telefono sulla stessa rete (host: true)
  // e il WebSocket passa al server di gioco, avviato insieme.
  server: { host: true, proxy: { "/ws": { target: "ws://localhost:8081", ws: true } } },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Giochi da tavola",
        short_name: "Giochi",
        description: "Raccolta di giochi da tavola e party game, anche offline.",
        lang: "it",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0e1a16",
        theme_color: "#0e1a16",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/ws/, /^\/salute/],
      },
    }),
  ],
});
