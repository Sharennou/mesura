export const APP_NAME = "Mesura";
export const APP_SLUG =
  APP_NAME.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "application";
export const CONSENT_VERSION = "2026-10-05.1";
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const CONSENT_TEXTS = {
  body: "Je consens explicitement à enregistrer mes mesures corporelles et mes notes privées pour suivre leur évolution. Je peux retirer ce consentement et supprimer mes données à tout moment.",
  photos:
    "Je consens à stocker mes photos corporelles, privées, pour les consulter et les comparer. Les métadonnées sont supprimées ; aucune analyse par IA n’est effectuée.",
  push: "Je souhaite recevoir des rappels discrets par notification sur cet appareil. Ce choix est indépendant de l’autorisation du navigateur.",
  email:
    "Je souhaite recevoir des rappels discrets à l’adresse email vérifiée de mon compte.",
} as const;
