import { build } from "esbuild";
import { mkdirSync } from "node:fs";
mkdirSync(".runtime", { recursive: true });
await build({
  entryPoints: ["supabase/functions/mesura-api/index.ts"],
  outfile: ".runtime/mesura-api.ts",
  bundle: true,
  platform: "neutral",
  format: "esm",
  target: "es2022",
  external: ["npm:*", "https://*"],
  alias: {
    "@supabase/supabase-js": "npm:@supabase/supabase-js@2.117.2",
    zod: "npm:zod@4.6.5",
    luxon: "npm:luxon@3.7.2",
    fflate: "npm:fflate@0.8.3",
    "web-push": "npm:web-push@3.6.7",
  },
});
console.log("Fonction autonome prête dans .runtime/mesura-api.ts");
