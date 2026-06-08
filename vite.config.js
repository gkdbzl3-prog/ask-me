import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: "autoUpdate",
      includeAssets: ["images/landing-logo.png", "images/icon-192.png", "images/icon-512.png", "images/icon-512-maskable.png"],
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,woff,woff2,ttf,png,svg}"],
      },
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
