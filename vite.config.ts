import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { APP_NAME } from "./shared/config.ts";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    react(),
    {
      name: "application-name",
      transformIndexHtml: (html: string) =>
        html.replace(
          "Mesura — Votre repère du jour",
          `${APP_NAME} — Votre repère du jour`,
        ),
    },
  ],
  server: {
    port: Number(process.env.MESURA_WEB_PORT || 5173),
    strictPort: true,
    proxy: { "/api": process.env.MESURA_API_URL || "http://127.0.0.1:3001" },
  },
});
