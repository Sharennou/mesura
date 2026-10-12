import { mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { generateEntryStyles } from "./entry-styles";
import { APP_NAME } from "../shared/config";
mkdirSync("public", { recursive: true });
// Supplied artwork is kept intact in the PNG sources. Only frame and encode
// display sizes here; never redraw the symbol or the accented wordmark.
for (const scale of [2, 3])
  await sharp("src/assets/somevo-logo.png")
    .extract({ left: 222, top: 200, width: 1500, height: 375 })
    .resize(220 * scale, 55 * scale)
    .webp({ quality: 90, alphaQuality: 100, smartSubsample: true, effort: 6 })
    .toFile(`src/assets/somevo-logo${scale === 3 ? "@3x" : ""}.webp`);
const basePath = process.env.VITE_BASE_PATH || "/";
if (!basePath.startsWith("/") || !basePath.endsWith("/"))
  throw new Error("VITE_BASE_PATH doit commencer et finir par /.");
// The original square has enough breathing room for maskable app icons.
for (const size of [192, 512])
  await sharp("src/assets/somevo-icon.png")
    .resize(size, size)
    .png()
    .toFile(`public/icon-${size}.png`);
await sharp("src/assets/somevo-icon.png")
  .resize(180, 180)
  .png()
  .toFile("public/apple-touch-icon.png");
await sharp("src/assets/somevo-icon.png")
  .extract({ left: 250, top: 220, width: 780, height: 780 })
  .resize(64, 64)
  .png()
  .toFile("public/favicon.png");
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
      background_color: "#1B1B1B",
      theme_color: "#1B1B1B",
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
  `self.SOMEVO_CONFIG = ${JSON.stringify({ name: APP_NAME, basePath, version: String(Date.now()) })};\n`,
);

generateEntryStyles();
