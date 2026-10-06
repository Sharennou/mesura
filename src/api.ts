import { createAuthClient } from "better-auth/react";
import { APP_NAME, APP_SLUG } from "../shared/config";
import { CLOUD } from "./deployment";
import { cloudAuthClient, cloudEndpoint, cloudHeaders } from "./cloud-auth";
const localAuthClient = CLOUD
  ? null
  : createAuthClient({ baseURL: window.location.origin });
export const authClient = (
  CLOUD ? cloudAuthClient : localAuthClient
) as NonNullable<typeof localAuthClient>;
export const useSession = authClient.useSession;
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return (await apiResponse(path, options)).json();
}
export async function apiResponse(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("X-Requested-With", APP_NAME);
  headers.set("X-Timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (CLOUD) await cloudHeaders(headers);
  let response: Response;
  try {
    response = await fetch(CLOUD ? `${cloudEndpoint}${path}` : `/api${path}`, {
      ...options,
      headers,
      credentials: CLOUD ? "omit" : "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new Error(
      "La connexion est interrompue. Vos champs sont conservés ; réessayez une fois connecté.",
    );
  }
  if (!response.ok) {
    // An expired/deleted session must release the authenticated screen. Network
    // failures and forbidden resources must not log the user out.
    if (response.status === 401) await authClient.signOut();
    const error = await response.json().catch(() => null);
    throw new Error(error?.error || "Le service est indisponible. Réessayez.");
  }
  return response;
}
export async function downloadExport(format: string) {
  const response = await apiResponse("/export", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": APP_NAME,
    },
    credentials: "same-origin",
    body: JSON.stringify({ format }),
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
