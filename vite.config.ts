import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { APP_NAME } from "./shared/config.ts";
export default defineConfig({
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
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:3001" },
  },
});
