import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev proxy notes
 * --------------
 * - If Vite runs on your HOST machine, keep BACKEND_URL as http://localhost:8001
 * - If Vite runs INSIDE Docker (frontend container), localhost points to the container itself.
 *   In that case set VITE_BACKEND_URL=http://managora_backend:8001 (or your backend service name/port). * 
 *
 * You can override the proxy target without editing this file:
 *   Windows (PowerShell):
 *     $env:VITE_BACKEND_URL="http://localhost:8001"; npm run dev
 *   Docker:
 *     VITE_BACKEND_URL=http://managora_backend:8001 * 
 */
const BACKEND_URL = process.env.VITE_BACKEND_URL || "http://localhost:8001";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      // Avoid CORS in dev: frontend calls /api/* and Vite proxies to backend
      "/api": {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      // Let Django admin open from the frontend origin (http://localhost:5174/managora_super/)
      "/managora_super": {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      // If you serve media files locally
      "/media": {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
      // Django admin assets (CSS/JS/images)
      "/static/admin": {
        target: BACKEND_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
