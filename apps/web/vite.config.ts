import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
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
        background_color: "#14161f",
        theme_color: "#14161f",
        icons: [
          { src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,json,woff2}"],
      },
    }),
  ],
});
