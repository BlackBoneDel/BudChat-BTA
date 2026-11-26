import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config para Budsin Chat (frontend React)
// - Base relativo para desplegar en Cloudflare Pages (cualquier ruta)
// - Build optimizado: code-splitting automático por dinámico import()
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    sourcemap: false,
    target: "es2020",
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split vendors para mejor caché en el borde
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          markdown: ["marked", "dompurify"],
        },
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
