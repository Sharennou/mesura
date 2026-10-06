import { accountCsv, EXPORT_SCHEMA_VERSION } from "../../../shared/export.ts";
import { createClient, type User } from "@supabase/supabase-js";
import { z } from "zod";
import { DateTime } from "luxon";
import { zipSync, strToU8 } from "fflate";
import webpush from "web-push";
import {
  cloudCommit,
  cloudFail,
  emptyCloudAccount,
  mutateCloudAccount,
  photoIds,
  publicCloudAccount,
  type CloudAccount,
} from "../../../shared/cloud-domain.ts";
import { APP_NAME, APP_SLUG } from "../../../shared/config.ts";
import { nextOccurrences } from "../../../shared/recurrence.ts";
import type { Capabilities } from "../../../shared/types.ts";

const projectURL = Deno.env.get("SUPABASE_URL")!;
const service = createClient(
  projectURL,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const appURL =
  Deno.env.get("MESURA_APP_URL") || "https://sharennou.github.io/mesura/";
const appOrigin = new URL(appURL).origin;
const photos = service.storage.from("mesura-photos");
type PushConfig = { publicKey: string; privateKey: string; subject: string };
let pushConfig: Promise<PushConfig> | null = null;
async function configurePush(): Promise<PushConfig> {
  if (!pushConfig) {
    pushConfig = (async () => {
      const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
      const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
      const subject = Deno.env.get("VAPID_SUBJECT");
      const config: PushConfig =
        publicKey && privateKey && subject
          ? { publicKey, privateKey, subject }
          : check(
              await service.rpc("mesura_vapid", {
                p_candidate: {
                  ...webpush.generateVAPIDKeys(),
                  subject: appURL,
                },
              }),
            );
      webpush.setVapidDetails(
        config.subject,
        config.publicKey,
        config.privateKey,
      );
      return config;
    })().catch((error) => {
      pushConfig = null;
      throw error;
    });
  }
  return pushConfig;
}
const envCaps: Capabilities = {
  pushConfigured: false,
  emailConfigured: Boolean(
    Deno.env.get("RESEND_API_KEY") && Deno.env.get("MAIL_FROM"),
  ),
  development: false,
  privacyContact: Deno.env.get("PRIVACY_CONTACT") || null,
};
const check = <T>(r: { data: T; error: unknown }) => {
  if (r.error)
    cloudFail("Le service de sauvegarde est indisponible. Réessayez.", 503);
  return r.data;
};
async function caps(): Promise<Capabilities> {
  envCaps.pushConfigured = Boolean(await configurePush().catch(() => null));
  const scheduled = await service.rpc("mesura_jobs_ready");
  return {
    ...envCaps,
    pushConfigured: envCaps.pushConfigured && scheduled.data === true,
    emailConfigured: envCaps.emailConfigured && scheduled.data === true,
  };
}
async function loadAccount(user: User, zone = "UTC") {
  const tombstone = check(
    await service
      .from("mesura_tombstones")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  );
  if (tombstone) cloudFail("Ce compte a été supprimé.", 401);
  let row = check(
    await service
      .from("mesura_accounts")
      .select("data,revision")
      .eq("user_id", user.id)
      .maybeSingle(),
  );
  if (!row) {
    const data = emptyCloudAccount(
      String(user.user_metadata?.name || "Mon espace").slice(0, 100),
      zone,
    );
    check(
      await service
        .from("mesura_accounts")
        .upsert(
          { user_id: user.id, data },
          { onConflict: "user_id", ignoreDuplicates: true },
        ),
    );
    row = check(
      await service
        .from("mesura_accounts")
        .select("data,revision")
        .eq("user_id", user.id)
        .single(),
    );
  }
  return row as { data: CloudAccount; revision: number };
}
async function apply(
  user: User,
  change: (a: CloudAccount) => { account: CloudAccount; result: unknown },
  active = true,
) {
  return cloudCommit(
    () => loadAccount(user),
    async (revision, data) =>
      check(
        await service.rpc("mesura_commit", {
          p_user_id: user.id,
          p_revision: revision,
          p_data: data,
          p_active: active,
        }),
      ) === true,
    change,
  );
}
async function authenticate(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) cloudFail("Connectez-vous pour accéder à votre espace.", 401);
  const { data, error } = await service.auth.getUser(token);
  if (error || !data.user)
    cloudFail("Connectez-vous pour accéder à votre espace.", 401);
  let sid = "";
  try {
    sid = JSON.parse(
      atob(token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
    ).session_id;
  } catch {}
  if (
    !z.uuid().safeParse(sid).success ||
    check(
      await service.rpc("mesura_session_active", {
        p_user_id: data.user.id,
        p_session_id: sid,
      }),
    ) !== true
  )
    cloudFail("Cette session a expiré. Connectez-vous à nouveau.", 401);
  return data.user;
}
async function rate(user: User, scope: string, max: number, seconds: number) {
  if (
    check(
      await service.rpc("mesura_rate_limit", {
        p_user_id: user.id,
        p_scope: scope,
        p_max: max,
        p_seconds: seconds,
      }),
    ) !== true
  )
    cloudFail(
      "Trop de tentatives. Patientez quelques instants puis réessayez.",
      429,
    );
}
async function cleanup(userId?: string) {
  let query = service
    .from("mesura_photo_gc")
    .select("path,user_id")
    .lte("not_before", new Date().toISOString())
    .limit(100);
  if (userId) query = query.eq("user_id", userId);
  const rows = check(await query);
  for (const item of rows || []) {
    const account = check(
      await service
        .from("mesura_accounts")
        .select("data")
        .eq("user_id", item.user_id)
        .maybeSingle(),
    );
    const id = item.path.split("/")[1]?.replace(/\.jpg$/, "");
    if (!account || !photoIds(account.data).includes(id))
      check(await photos.remove([item.path]));
    check(await service.from("mesura_photo_gc").delete().eq("path", item.path));
  }
}
async function erase(userId: string) {
  check(await service.rpc("mesura_mark_deleted", { p_user_id: userId }));
  await cleanup(userId);
  const result = await service.auth.admin.deleteUser(userId);
  if (result.error && result.error.status !== 404)
    cloudFail("La suppression est en cours. Réessayez dans un instant.", 503);
}
const csv = (a: CloudAccount) => accountCsv(publicCloudAccount(a));
async function exportData(req: Request, a: CloudAccount, headers: Headers) {
  const opts = z
    .object({
      format: z.enum(["json", "csv", "zip"]),
    })
    .parse(await req.json());
  const json = JSON.stringify(
    {
      schemaVersion: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      ...publicCloudAccount(a),
      consentHistory: a.audit,
    },
    null,
    2,
  );
  headers.set(
    "Content-Disposition",
    `attachment; filename="${APP_SLUG}-${new Date().toISOString().slice(0, 10)}.${opts.format}"`,
  );
  if (opts.format === "json" || opts.format === "csv") {
    headers.set(
      "Content-Type",
      opts.format === "json" ? "application/json" : "text/csv; charset=utf-8",
    );
    return new Response(opts.format === "json" ? json : csv(a), { headers });
  }
  const files: Record<string, Uint8Array> = {
    "donnees.json": strToU8(json),
    "mesures.csv": strToU8(csv(a)),
  };
  headers.set("Content-Type", "application/zip");
  return new Response(zipSync(files, { level: 3 }), { headers });
}
async function runJobs() {
  envCaps.pushConfigured = Boolean(await configurePush().catch(() => null));
  const now = DateTime.now();
  check(
    await service
      .from("mesura_system")
      .upsert({ id: "jobs", heartbeat: now.toISO() }),
  );
  const accounts = check(
    await service
      .from("mesura_accounts")
      .select("user_id,data")
      .eq("data->reminder->>enabled", "true")
      .lte("data->reminder->>nextAt", now.toISO()!)
      .limit(100),
  );
  for (const row of accounts || []) {
    let a = row.data as CloudAccount;
    const reminder = a.reminder!;
    const occurrence = reminder.nextAt!;
    const revision = a.reminderRevision;
    const userResult = await service.auth.admin.getUserById(row.user_id);
    const user = userResult.data.user;
    if (!user) continue;
    if (
      now.toMillis() - DateTime.fromISO(occurrence).toMillis() <= 3600000 &&
      a.consents.body &&
      a.consents[reminder.channel]
    ) {
      const devices =
        reminder.channel === "email"
          ? [{ endpoint: "email" }]
          : a.subscriptions;
      for (const device of devices) {
        const hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(device.endpoint),
            ),
          ),
        )
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("");
        const claim = check(
          await service.rpc("mesura_claim_delivery", {
            p_user_id: user.id,
            p_occurrence: occurrence,
            p_revision: revision,
            p_device: hash,
          }),
        );
        if (!claim) continue;
        a = (await loadAccount(user)).data;
        if (
          !a.consents.body ||
          !a.consents[reminder.channel] ||
          !a.reminder?.enabled ||
          a.reminderRevision !== revision
        )
          continue;
        let status = "sent";
        try {
          if (
            reminder.channel === "push" &&
            envCaps.pushConfigured &&
            a.subscriptions.some((s) => s.endpoint === device.endpoint)
          )
            await webpush.sendNotification(
              device as any,
              JSON.stringify({ tag: `mesura-${occurrence}` }),
              { TTL: 3600 },
            );
          else if (reminder.channel === "email" && envCaps.emailConfigured) {
            const r = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: Deno.env.get("MAIL_FROM"),
                to: user.email,
                subject: `${APP_NAME} — Votre repère du jour`,
                text: "Votre rendez-vous de mesures vous attend.",
              }),
            });
            if (!r.ok) throw new Error("Email indisponible");
          } else status = "unavailable";
        } catch (error: any) {
          status = "failed";
          if ([404, 410].includes(error.statusCode))
            await apply(
              user,
              (current) => ({
                account: {
                  ...current,
                  subscriptions: current.subscriptions.filter(
                    (s) => s.endpoint !== device.endpoint,
                  ),
                },
                result: null,
              }),
              false,
            );
        }
        check(
          await service
            .from("mesura_deliveries")
            .update({ status })
            .eq("user_id", user.id)
            .eq("occurrence", occurrence)
            .eq("revision", revision)
            .eq("device", hash),
        );
      }
    }
    await apply(
      user,
      (current) => {
        if (current.reminderRevision === revision && current.reminder)
          current.reminder.nextAt =
            nextOccurrences(current.reminder, now, 1)[0] || null;
        return { account: current, result: null };
      },
      false,
    );
  }
  const tombstones = check(
    await service.from("mesura_tombstones").select("user_id").limit(100),
  );
  for (const row of tombstones || []) {
    const r = await service.auth.admin.deleteUser(row.user_id);
    if (r.error && r.error.status !== 404) continue;
  }
  const inactive = check(
    await service
      .from("mesura_accounts")
      .select("user_id")
      .lt("last_active", now.minus({ months: 24 }).toISO()!)
      .limit(100),
  );
  for (const row of inactive || []) await erase(row.user_id);
  await cleanup();
  check(
    await service
      .from("mesura_deliveries")
      .delete()
      .lt("created_at", now.minus({ days: 30 }).toISO()!),
  );
  check(
    await service
      .from("mesura_rate_limits")
      .delete()
      .lt("window_started", now.minus({ days: 1 }).toISO()!),
  );
  check(
    await service
      .from("mesura_tombstones")
      .delete()
      .lt("deleted_at", now.minus({ days: 35 }).toISO()!),
  );
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = new Headers({
    "Cache-Control": "no-store, private",
    Vary: "Origin",
    "X-Content-Type-Options": "nosniff",
    "Content-Type": "application/json",
  });
  if (origin === appOrigin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set(
      "Access-Control-Allow-Headers",
      "authorization,apikey,content-type,x-requested-with,x-timezone",
    );
    headers.set(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    );
  }
  const json = (value: unknown, status = 200) =>
    new Response(JSON.stringify(value), { status, headers });
  try {
    const path = new URL(req.url).pathname.split("/mesura-api")[1] || "/";
    if (req.method === "OPTIONS")
      return new Response(null, {
        status: origin === appOrigin ? 204 : 403,
        headers,
      });
    if (path === "/jobs") {
      if (
        req.method !== "POST" ||
        check(
          await service.rpc("mesura_check_job_secret", {
            p_secret: req.headers.get("x-mesura-jobs-secret") || "",
          }),
        ) !== true
      )
        cloudFail("Accès refusé.", 403);
      await runJobs();
      return json({ status: "ok" });
    }
    if (origin && origin !== appOrigin)
      cloudFail("Origine non autorisée.", 403);
    if (path === "/config" && req.method === "GET") return json(await caps());
    if (path === "/health" && req.method === "GET") {
      check(await service.from("mesura_accounts").select("user_id").limit(1));
      return json({ status: "ok" });
    }
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.headers.get("x-requested-with") !== APP_NAME
    )
      cloudFail("Requête non autorisée.", 403);
    const user = await authenticate(req);
    await rate(user, "api", 120, 60);
    let current = await loadAccount(
      user,
      req.headers.get("x-timezone") || "UTC",
    );
    check(
      await service
        .from("mesura_accounts")
        .update({ last_active: new Date().toISOString() })
        .eq("user_id", user.id),
    );
    if (path === "/account" && req.method === "GET")
      return json(publicCloudAccount(current.data));
    if (path === "/consents" && req.method === "GET")
      return json(current.data.audit);
    if (path === "/push-key" && req.method === "GET")
      return json({
        key: (await caps()).pushConfigured
          ? (await configurePush()).publicKey
          : null,
      });
    if (path === "/device-status" && req.method === "POST") {
      const v = z
        .object({ endpoint: z.string().max(2000) })
        .parse(await req.json());
      return json({
        active: current.data.subscriptions.some(
          (s) => s.endpoint === v.endpoint,
        ),
      });
    }
    if (path === "/export" && req.method === "POST") {
      await rate(user, "export", 5, 60);
      return await exportData(req, current.data, headers);
    }
    if (path === "/account" && req.method === "DELETE") {
      await rate(user, "delete", 5, 600);
      const v = z
        .object({ password: z.string().min(1).max(128) })
        .parse(await req.json());
      const verifier = createClient(
        projectURL,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const verified = await verifier.auth.signInWithPassword({
        email: user.email!,
        password: v.password,
      });
      if (verified.error || verified.data.user?.id !== user.id)
        cloudFail("Le mot de passe actuel ne correspond pas.", 403);
      await verifier.auth.signOut();
      await erase(user.id);
      return json({ ok: true });
    }
    if (path.startsWith("/entries") && ["POST", "PUT"].includes(req.method)) {
      await rate(user, "entries", 30, 300);
      if (!current.data.consents.body)
        cloudFail("Le suivi corporel est désactivé.", 403);
      if (req.headers.get("content-type")?.includes("multipart/form-data"))
        cloudFail("L’ajout de photos a été retiré.", 415);
      const raw = await req.json();
      const next = await apply(user, (a) =>
        mutateCloudAccount(a, req.method, path, raw, envCaps),
      );
      await cleanup(user.id);
      return json(next.result);
    }
    const raw =
      req.method === "DELETE" && path !== "/subscriptions"
        ? {}
        : await req.json();
    const configured = await caps();
    const next = await apply(user, (a) =>
      mutateCloudAccount(a, req.method, path, raw, configured),
    );
    await cleanup(user.id);
    return json(next.result);
  } catch (error: any) {
    const status =
      error instanceof z.ZodError || error instanceof SyntaxError
        ? 400
        : error.statusCode || 503;
    return json(
      {
        error:
          status === 400 &&
          (error instanceof z.ZodError || error instanceof SyntaxError)
            ? "Vérifiez les informations saisies."
            : error.statusCode
              ? error.message
              : "Le service est indisponible. Vos champs sont conservés ; réessayez.",
      },
      status,
    );
  }
});
