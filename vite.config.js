import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["images/landing-logo.png", "images/icon-192.png", "images/icon-512.png", "images/icon-512-maskable.png"],
      manifest: {
        name: "Ask me",
        short_name: "Ask me",
        description: "익명질문함",
        theme_color: "#d7c4f8",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "images/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "images/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "images/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff,woff2,ttf,png,svg}"],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith("/api") ||
              url.pathname.startsWith("/archive"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24,
              },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname.includes("supabase"),
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-images",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/auth": "http://localhost:8080",
      "/archive": "http://localhost:8080"
    },
  },
});
