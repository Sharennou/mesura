// GitHub Pages utilise Supabase ; le serveur local conserve son propre backend.
export const CLOUD = import.meta.env.VITE_DEPLOYMENT === "supabase";
export const BASE_PATH = import.meta.env.BASE_URL;
