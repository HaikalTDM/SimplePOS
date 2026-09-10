/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt" (not autoUpdate): the app shows a "New version ready" banner
      // and reloads on the user's tap. Reloading never touches IndexedDB, so
      // local data survives. autoUpdate would activate the new worker but an
      // already-open tab would keep running the old code until a manual reload.
      registerType: "prompt",
      devOptions: { enabled: true },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2,webmanifest,json}"],
      },
      manifest: {
        name: "SimplePOS",
        short_name: "SimplePOS",
        start_url: "/",
        display: "standalone",
        background_color: "#F5F1E8",
        theme_color: "#6B7C99",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/icons/maskable-512.png",
            sizes: "any",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts"
  }
});
