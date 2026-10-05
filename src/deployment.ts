// Seule la compilation GitHub Pages active cet aperçu sans serveur.
export const CLOUD = import.meta.env.VITE_DEPLOYMENT === "supabase";
export const PREVIEW_ONLY = import.meta.env.VITE_PREVIEW_ONLY === "true";
export const BASE_PATH = import.meta.env.BASE_URL;
