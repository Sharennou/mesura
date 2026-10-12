import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { prerenderEntry } from "./scripts/prerender-entry.ts";
import { ENTRY_BOOTSTRAP } from "./shared/entry-bootstrap.ts";
import { APP_NAME } from "./shared/config.ts";
export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [
    react(),
    {
      name: "inline-entry-styles",
      enforce: "post",
      async generateBundle(_options, bundle) {
        const html = bundle["index.html"];
        if (!html || html.type !== "asset") return;
        const base = process.env.VITE_BASE_PATH || "/";
        const logoAsset = Object.values(bundle).find(
          (asset) =>
            asset.type === "asset" &&
            asset.fileName.match(/mesura-logo-[^/]+\.webp$/),
        );
        const retinaAsset = Object.values(bundle).find(
          (asset) =>
            asset.type === "asset" &&
            asset.fileName.match(/mesura-logo@3x-[^/]+\.webp$/),
        );
        if (!logoAsset || !retinaAsset)
          throw new Error("Logo assets missing from the public entry.");
        const markup = await prerenderEntry(
          `${base}${logoAsset.fileName}`,
          `${base}${retinaAsset.fileName}`,
        );
        html.source = String(html.source)
          .replace(
            '<div id="root"></div>',
            `<div id="root" data-prerender="public" inert>${markup}</div>`,
          )
          .replace(
            "</head>",
            `<style>html[data-entry="dynamic"] #root[data-prerender="public"]{visibility:hidden}</style><script>${ENTRY_BOOTSTRAP}</script></head>`,
          );
        html.source = String(html.source).replace(
          /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
          (tag, href: string) => {
            const css = bundle[href.slice(base.length)];
            if (!css || css.type !== "asset") return tag;
            return `<style>${String(css.source)}</style>`;
          },
        );
      },
    },
    {
      name: "application-name",
      transformIndexHtml: (html: string) =>
        html.replace(
          "Mesura — Votre repère du jour",
          `${APP_NAME} — Votre repère du jour`,
        ),
    },
  ],
  build: { manifest: true },
  server: {
    port: Number(process.env.MESURA_WEB_PORT || 5173),
    strictPort: true,
    proxy: { "/api": process.env.MESURA_API_URL || "http://127.0.0.1:3001" },
  },
});
