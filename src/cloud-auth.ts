import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "../shared/cloud-config";
import { BASE_PATH, CLOUD } from "./deployment";
let clientPromise: Promise<SupabaseClient> | null = null;
export function hasCloudSession() {
  if (!CLOUD) return true;
  const url = new URL(location.href);
  if (
    url.searchParams.has("code") ||
    url.hash.includes("access_token=") ||
    url.hash.includes("error=")
  )
    return true;
  try {
    const project = new URL(
      import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL,
    ).hostname.split(".")[0];
    return Boolean(localStorage.getItem(`sb-${project}-auth-token`));
  } catch {
    // If storage is inaccessible, verify with Auth instead of assuming anonymity.
    return true;
  }
}
function getCloud() {
  if (!clientPromise)
    clientPromise = import("@supabase/supabase-js")
      .then(({ createClient }) => {
        const client = createClient(
          import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_PUBLIC_KEY || SUPABASE_PUBLIC_KEY,
          {
            auth: {
              flowType: new URLSearchParams(location.search).has("code")
                ? "pkce"
                : "implicit",
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
            },
          },
        );
        window.dispatchEvent(new Event("mesura:auth-ready"));
        return client;
      })
      .catch((error) => {
        clientPromise = null;
        throw error;
      });
  return clientPromise;
}
const codes: Record<string, string> = {
  invalid_credentials: "INVALID_EMAIL_OR_PASSWORD",
  user_already_exists: "USER_ALREADY_EXISTS",
  weak_password: "PASSWORD_TOO_SHORT",
  otp_expired: "INVALID_TOKEN",
};
function response<T extends { error: any; data?: any }>(r: T) {
  return {
    data: r.data ?? null,
    error: r.error
      ? {
          code: codes[r.error.code] || r.error.code || "SERVICE_UNAVAILABLE",
          message: "La demande n’a pas abouti. Réessayez.",
        }
      : null,
  };
}
function sessionView(s: Session | null) {
  return s
    ? {
        user: {
          id: s.user.id,
          email: s.user.email || "",
          name: s.user.user_metadata.name || "Mon espace",
          emailVerified: Boolean(s.user.email_confirmed_at),
          image: null,
          createdAt: new Date(s.user.created_at),
          updatedAt: new Date(s.user.updated_at || s.user.created_at),
        },
        session: {
          id: s.user.id,
          expiresAt: new Date((s.expires_at || 0) * 1000),
        },
      }
    : null;
}
let initialSession: Promise<Session | null> | null = null;
let initializing = true;
function resolveInitialSession(cloud: SupabaseClient) {
  if (!initialSession)
    initialSession = (async () => {
      const url = new URL(location.href);
      try {
        const { error } = await cloud.auth.initialize();
        if (error) {
          history.replaceState(
            null,
            "",
            `${url.pathname}?auth_error=confirmation#account`,
          );
          return null;
        }
        // Le SDK vérifie le jeton auprès d’Auth et nettoie le fragment de l’URL.
        const { data } = await cloud.auth.getSession();
        return data.session;
      } catch {
        history.replaceState(
          null,
          "",
          `${url.pathname}?auth_error=confirmation#account`,
        );
        return null;
      } finally {
        initializing = false;
      }
    })();
  return initializing
    ? initialSession
    : cloud.auth.getSession().then(({ data }) => data.session);
}
function useCloudSession() {
  const [value, setValue] = useState<{
    data: ReturnType<typeof sessionView>;
    isPending: boolean;
  }>(() => ({ data: null, isPending: hasCloudSession() }));
  useEffect(() => {
    let active = true;
    let connecting = false;
    let unsubscribe: (() => void) | undefined;
    const connect = async () => {
      if (connecting) return;
      connecting = true;
      try {
        const cloud = await getCloud();
        if (!active) return;
        const { data } = cloud.auth.onAuthStateChange((_event, session) => {
          if (active && !initializing)
            setValue({ data: sessionView(session), isPending: false });
        });
        unsubscribe = () => data.subscription.unsubscribe();
        const session = await resolveInitialSession(cloud);
        if (active) setValue({ data: sessionView(session), isPending: false });
      } catch {
        connecting = false;
        if (active) setValue({ data: null, isPending: false });
      }
    };
    window.addEventListener("mesura:auth-ready", connect);
    if (hasCloudSession() || clientPromise) void connect();
    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener("mesura:auth-ready", connect);
    };
  }, []);
  return value;
}
export const cloudAuthClient = {
  useSession: useCloudSession,
  signUp: {
    email: async ({ email, password, name, callbackURL }: any) =>
      response(
        await (
          await getCloud()
        ).auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: callbackURL },
        }),
      ),
  },
  signIn: {
    email: async ({ email, password }: any) =>
      response(
        await (await getCloud()).auth.signInWithPassword({ email, password }),
      ),
  },
  signOut: async () =>
    response(await (await getCloud()).auth.signOut({ scope: "local" })),
  requestPasswordReset: async ({ email, redirectTo }: any) =>
    response(
      await (
        await getCloud()
      ).auth.resetPasswordForEmail(email, { redirectTo }),
    ),
  resetPassword: async ({ newPassword }: any) => {
    const r = await (
      await getCloud()
    ).auth.updateUser({ password: newPassword });
    if (!r.error) await (await getCloud()).auth.signOut({ scope: "global" });
    return response(r);
  },
  listSessions: async () => {
    const { data, error } = await (await getCloud()).rpc("mesura_sessions");
    return response({ data, error });
  },
  revokeOtherSessions: async () =>
    response(await (await getCloud()).auth.signOut({ scope: "others" })),
};
export function cloudPublicHeaders(headers: Headers) {
  headers.set(
    "apikey",
    import.meta.env.VITE_SUPABASE_PUBLIC_KEY || SUPABASE_PUBLIC_KEY,
  );
}
export async function cloudHeaders(headers: Headers) {
  const { data, error } = await (await getCloud()).auth.getSession();
  if (error)
    throw new Error("Votre session a expiré. Connectez-vous à nouveau.");
  cloudPublicHeaders(headers);
  if (data.session)
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
}
export const cloudEndpoint = `${import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL}/functions/v1/mesura-api`;
export const appURL = () => `${location.origin}${BASE_PATH}`;
