import { createServer } from "vite";
import react from "@vitejs/plugin-react";

export async function prerenderEntry(logo: string, logoRetina: string) {
  const server = await createServer({
    configFile: false,
    plugins: [react()],
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
    base: process.env.VITE_BASE_PATH || "/",
  });
  try {
    const { renderPublicEntry } = await server.ssrLoadModule(
      "/src/PublicEntry.tsx",
    );
    return renderPublicEntry(logo, logoRetina) as string;
  } finally {
    await server.close();
  }
}
