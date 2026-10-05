import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { APP_NAME } from "../shared/config";
mkdirSync("public", { recursive: true });
const basePath = process.env.VITE_BASE_PATH || "/";
if (!basePath.startsWith("/") || !basePath.endsWith("/"))
  throw new Error("VITE_BASE_PATH doit commencer et finir par /.");
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#D7FF3F"/><rect x="90" y="90" width="332" height="332" rx="76" fill="#0C0C10"/><path d="M161 345V166h62l47 99 44-99h39v179M161 217h36M161 269h36M161 321h36" fill="none" stroke="#D7FF3F" stroke-width="28" stroke-linejoin="round"/></svg>';
writeFileSync("public/icon.svg", svg);
for (const size of [192, 512])
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
writeFileSync(
  "public/manifest.webmanifest",
  JSON.stringify(
    {
      id: basePath,
      name: APP_NAME,
      short_name: APP_NAME,
      description: "Vos mesures, votre rythme. Un repère à la fois.",
      lang: "fr",
      start_url: `${basePath}#measure`,
      scope: basePath,
      display: "standalone",
      background_color: "#F3F3EE",
      theme_color: "#D7FF3F",
      icons: [192, 512].map((size) => ({
        src: `${basePath}icon-${size}.png`,
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any maskable",
      })),
    },
    null,
    2,
  ),
);
writeFileSync(
  "public/app-config.js",
  `self.MESURA_CONFIG = ${JSON.stringify({ name: APP_NAME, basePath, version: String(Date.now()) })};\n`,
);
