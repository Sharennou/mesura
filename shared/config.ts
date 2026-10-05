export const APP_NAME = "Mesura";
// Supabase hébergé impose au moins 6 caractères.
export const MIN_PASSWORD_LENGTH = 6;
export const APP_SLUG =
  APP_NAME.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "application";
export const CONSENT_VERSION = "2026-10-05.2";
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const CONSENT_TEXTS = {
  body: "J’autorise explicitement l’enregistrement de ma taille, de mes mesures, de mes objectifs et de mes notes privées pour suivre mon évolution. Je peux retirer cette autorisation et supprimer mes données à tout moment.",
  photos:
    "Je consens à stocker mes photos corporelles, privées, pour les consulter et les comparer. Les métadonnées sont supprimées ; aucune analyse par IA n’est effectuée.",
  push: "Je souhaite recevoir des rappels discrets par notification sur cet appareil. Ce choix est indépendant de l’autorisation du navigateur.",
  email:
    "Je souhaite recevoir des rappels discrets à l’adresse email de mon compte.",
} as const;
