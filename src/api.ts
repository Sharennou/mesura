import { createAuthClient } from "better-auth/react";
import { APP_NAME, APP_SLUG } from "../shared/config";
export const authClient = createAuthClient({ baseURL: window.location.origin });
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("X-Requested-With", APP_NAME);
  headers.set("X-Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "La connexion est interrompue. Vos champs sont conservés ; réessayez une fois connecté.",
    );
  }
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Le service est indisponible. Réessayez.");
  }
  return response.json();
}
export async function downloadExport(format: string, includePhotos: boolean) {
  const response = await fetch("/api/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": APP_NAME,
    },
    credentials: "same-origin",
    body: JSON.stringify({ format, includePhotos }),
  });
  if (!response.ok)
    throw new Error((await response.json()).error || "L’export a échoué.");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${APP_SLUG}-${new Date().toISOString().slice(0, 10)}.${format}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
