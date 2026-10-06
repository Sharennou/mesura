import { accountCsv, EXPORT_SCHEMA_VERSION } from "../shared/export";
import {
  toolProfileSchema,
  toolContextSchema,
  toolDateSchema,
  toolDateIssue,
} from "../shared/tool-schemas";
import { avatarSchema } from "../shared/avatar";
import Fastify, { type FastifyRequest } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import { fromNodeHeaders } from "better-auth/node";
import { z } from "zod";
import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { ZipArchive } from "archiver";
import { PassThrough } from "node:stream";
import {
  auth,
  appURL,
  production,
  emailConfigured,
  initializeDatabase,
} from "./auth";
import { db } from "./db";
import {
  accountData,
  consent,
  deletePhotos,
  cancelReminders,
  getEntries,
  getMeasures,
  getReminder,
} from "./repository";
import { pushConfigured } from "./jobs";
import { enforceDeletionLedger, eraseAccount } from "./retention";
import {
  nextOccurrences,
  reminderAnchor,
  reminderDays,
} from "../shared/recurrence";
import { localDate } from "../shared/calculations";
import { onboardingSchema } from "../shared/onboarding";
import {
  APP_NAME,
  APP_SLUG,
  CONSENT_TEXTS,
  CONSENT_VERSION,
} from "../shared/config";
import type { ConsentPurpose, Reminder } from "../shared/types";
z.config(z.locales.fr());
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (d) => DateTime.fromISO(d).isValid && DateTime.fromISO(d).toISODate() === d,
    "Date invalide.",
  );
const zoneSchema = z
  .string()
  .max(100)
  .refine((z) => DateTime.now().setZone(z).isValid, "Fuseau horaire invalide.");
function fail(message: string, status = 400): never {
  throw Object.assign(new Error(message), { statusCode: status });
}
export async function buildApp() {
  await initializeDatabase();
  enforceDeletionLedger();
  const app = Fastify({
    logger: false,
    bodyLimit: 128 * 1024,
    trustProxy: process.env.TRUST_PROXY || false,
  });
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "blob:", "data:"],
        fontSrc: ["'self'"],
        connectSrc: production
          ? ["'self'"]
          : ["'self'", "ws://localhost:5173", "ws://127.0.0.1:5173"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: production ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  });
  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: "Trop de tentatives. Patientez quelques instants puis réessayez.",
    }),
  });
  app.decorateRequest("owner", null);
  app.addHook("onRequest", async (req, reply) => {
    if (req.url.startsWith("/api/"))
      reply.header("Cache-Control", "no-store, private");
    if (
      req.url.startsWith("/api/") &&
      !["GET", "HEAD", "OPTIONS"].includes(req.method)
    ) {
      const origins = production
        ? [appURL]
        : [appURL, "http://localhost:5173", "http://127.0.0.1:5173"];
      if (!origins.includes(req.headers.origin || ""))
        fail("Origine de la requête non autorisée.", 403);
      if (
        !req.url.startsWith("/api/auth/") &&
        req.headers["x-requested-with"] !== APP_NAME
      )
        fail("Protection de la requête manquante.", 403);
    }
  });
  app.setErrorHandler((error: any, req, reply) => {
    if (error instanceof z.ZodError)
      return reply.status(400).send({
        error:
          "Vérifiez les champs : " +
          error.issues
            .map((i) => `${i.path.join(".")} — ${i.message}`)
            .join(" ; "),
      });
    const status = error.statusCode || 500;
    reply.status(status).send({
      error:
        status === 413
          ? "Requête trop volumineuse."
          : status < 500
            ? error.message
            : "La sauvegarde a échoué. Vos champs sont conservés ; réessayez.",
    });
  });
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    handler: async (req, reply) => {
      const response = await auth.handler(
        new Request(new URL(req.url, appURL), {
          method: req.method,
          headers: fromNodeHeaders(req.headers),
          ...(req.body ? { body: JSON.stringify(req.body) } : {}),
        }),
      );
      reply.status(response.status);
      for (const [key, value] of response.headers)
        if (key !== "set-cookie") reply.header(key, value);
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header("set-cookie", cookies);
      return reply.send(response.body ? await response.text() : null);
    },
  });
  app.get("/api/health", async (_req, reply) => {
    try {
      db.prepare("SELECT 1").get();
      return { status: "ok" };
    } catch {
      return reply.code(503).send({ status: "indisponible" });
    }
  });
  app.get("/api/config", async () => ({
    pushConfigured,
    emailConfigured,
    development: !production,
    privacyContact: process.env.PRIVACY_CONTACT || null,
  }));
  app.get("/api/push-key", async () => ({
    key: pushConfigured ? process.env.VAPID_PUBLIC_KEY : null,
  }));
  if (!production)
    app.get("/api/dev/mail", async (req) => {
      if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.ip))
        fail("Accès local uniquement.", 403);
      const { email } = z.object({ email: z.email() }).parse(req.query);
      return (
        db
          .prepare(
            "SELECT url, purpose FROM dev_mail WHERE email = ? AND expires_at > ? ORDER BY rowid DESC LIMIT 1",
          )
          .get(email, new Date().toISOString()) || null
      );
    });
  const owner = async (req: FastifyRequest) => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session?.user)
      fail("Connectez-vous pour accéder à votre espace.", 401);
    const browserZone = String(req.headers["x-timezone"] || "UTC");
    const timezone = DateTime.now().setZone(browserZone).isValid
      ? browserZone
      : "UTC";
    db.prepare(
      "INSERT INTO profiles (user_id, timezone, last_active) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET last_active = excluded.last_active",
    ).run(session!.user.id, timezone, new Date().toISOString());
    return session!;
  };
  app.get("/api/account", async (req) => {
    const s = await owner(req);
    return accountData(s.user.id, s.user.name);
  });
  app.post("/api/device-status", async (req) => {
    const s = await owner(req);
    const { endpoint } = z
      .object({ endpoint: z.string().max(2000) })
      .parse(req.body);
    return {
      active: Boolean(
        db
          .prepare(
            "SELECT id FROM subscriptions WHERE endpoint = ? AND user_id = ?",
          )
          .get(endpoint, s.user.id),
      ),
    };
  });
  app.patch("/api/profile", async (req) => {
    const s = await owner(req);
    const p = z
      .object({
        avatar: avatarSchema,
        toolProfile: toolProfileSchema.optional(),
        heightDate: toolDateSchema.nullable().optional(),
        name: z.string().trim().min(1).max(100),
        height: z.number().positive().max(300).nullable(),
        timezone: zoneSchema,
        visible: z.array(z.string()).max(40),
      })
      .parse(req.body);
    if (
      (p.height !== null || p.toolProfile || p.heightDate) &&
      !consent(s.user.id, "body")
    )
      fail("Activez le suivi corporel avant de renseigner votre stature.", 403);
    if (
      (p.heightDate && p.heightDate > localDate(p.timezone)) ||
      (p.toolProfile?.birthDate &&
        p.toolProfile.birthDate > localDate(p.timezone))
    )
      fail("Une date du profil est dans le futur. Vérifiez-la.");
    const ids = getMeasures(s.user.id)
      .filter((m) => !m.archived && m.id !== "weight")
      .map((m) => m.id);
    if (
      p.visible.some((id) => !ids.includes(id)) ||
      new Set(p.visible).size !== p.visible.length
    )
      fail("Sélection de mesures invalide.");
    const oldHeight = accountData(s.user.id, s.user.name).profile.height;
    db.transaction(() => {
      db.prepare("UPDATE user SET name = ?, updatedAt = ? WHERE id = ?").run(
        p.name,
        new Date().toISOString(),
        s.user.id,
      );
      db.prepare(
        "INSERT INTO profiles (user_id,height,timezone,visible) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET height = excluded.height, timezone = excluded.timezone, visible = excluded.visible",
      ).run(s.user.id, p.height, p.timezone, JSON.stringify(p.visible));
      if (p.toolProfile !== undefined)
        db.prepare(
          "UPDATE profiles SET tool_profile_json = ? WHERE user_id = ?",
        ).run(JSON.stringify(p.toolProfile), s.user.id);
      if (p.heightDate === undefined && oldHeight !== p.height)
        db.prepare(
          "UPDATE profiles SET height_date = NULL WHERE user_id = ?",
        ).run(s.user.id);
      if (p.heightDate !== undefined)
        db.prepare("UPDATE profiles SET height_date = ? WHERE user_id = ?").run(
          p.heightDate,
          s.user.id,
        );

      if (p.avatar !== undefined)
        db.prepare("UPDATE profiles SET avatar = ? WHERE user_id = ?").run(
          p.avatar,
          s.user.id,
        );
    })();
    return accountData(s.user.id, p.name);
  });
  app.post("/api/onboarding", async (req) => {
    const s = await owner(req);
    const setup = onboardingSchema.parse(req.body);
    if (
      setup.toolProfile?.birthDate &&
      setup.toolProfile.birthDate >
        localDate(accountData(s.user.id, s.user.name).profile.timezone)
    )
      fail("La date de naissance ne peut pas être dans le futur.");
    if (
      setup.goal &&
      !getMeasures(s.user.id).some(
        (m) => m.id === setup.goal!.measureId && !m.archived,
      )
    )
      fail("Mesure inconnue.");
    db.transaction(() => {
      if (!consent(s.user.id, "body"))
        db.prepare("INSERT INTO consents VALUES (?, ?, ?, ?, ?, ?, ?)").run(
          randomUUID(),
          s.user.id,
          "body",
          setup.version,
          CONSENT_TEXTS.body,
          1,
          new Date().toISOString(),
        );
      db.prepare(
        "UPDATE profiles SET height = ?, height_date = ?, onboarding_completed = 1 WHERE user_id = ?",
      ).run(setup.height, null, s.user.id);
      if (setup.toolProfile !== undefined)
        db.prepare(
          "UPDATE profiles SET tool_profile_json = ? WHERE user_id = ?",
        ).run(JSON.stringify(setup.toolProfile), s.user.id);
      if (setup.goal)
        db.prepare(
          "INSERT INTO goals VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET measure_id=excluded.measure_id, start=excluded.start, target=excluded.target, start_date=excluded.start_date",
        ).run(
          s.user.id,
          setup.goal.measureId,
          setup.goal.start,
          setup.goal.target,
          localDate(accountData(s.user.id, s.user.name).profile.timezone),
        );
      else db.prepare("DELETE FROM goals WHERE user_id = ?").run(s.user.id);
    })();
    return accountData(s.user.id, s.user.name);
  });
  app.get("/api/consents", async (req) => {
    const s = await owner(req);
    return db
      .prepare(
        "SELECT purpose, version, text, granted, created_at AS date FROM consents WHERE user_id = ? ORDER BY rowid DESC",
      )
      .all(s.user.id);
  });
  app.post("/api/consents", async (req) => {
    const s = await owner(req);
    const c = z
      .object({
        purpose: z.enum(["body", "photos", "push", "email"]),
        granted: z.boolean(),
        version: z.literal(CONSENT_VERSION),
      })
      .parse(req.body);
    if (c.granted && c.purpose === "photos")
      fail("L’ajout de photos a été retiré.", 410);
    if (c.granted && c.purpose !== "body" && !consent(s.user.id, "body"))
      fail("Le suivi principal doit être activé avant cette option.");
    // This endpoint completes all processing effects before acknowledging withdrawal.
    db.prepare("INSERT INTO consents VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      randomUUID(),
      s.user.id,
      c.purpose,
      c.version,
      CONSENT_TEXTS[c.purpose],
      Number(c.granted),
      new Date().toISOString(),
    );
    if (!c.granted) {
      if (c.purpose === "photos" || c.purpose === "body")
        deletePhotos(s.user.id);
      if (c.purpose === "body") {
        db.transaction(() => {
          db.prepare("DELETE FROM entries WHERE user_id = ?").run(s.user.id);
          db.prepare("DELETE FROM goals WHERE user_id = ?").run(s.user.id);
          db.prepare(
            "UPDATE profiles SET height = NULL, height_date = NULL, tool_profile_json = NULL WHERE user_id = ?",
          ).run(s.user.id);
        })();
        for (const purpose of ["photos", "push", "email"] as ConsentPurpose[])
          if (consent(s.user.id, purpose))
            db.prepare("INSERT INTO consents VALUES (?, ?, ?, ?, ?, ?, ?)").run(
              randomUUID(),
              s.user.id,
              purpose,
              c.version,
              CONSENT_TEXTS[purpose],
              0,
              new Date().toISOString(),
            );
        cancelReminders(s.user.id);
      }
      if (c.purpose === "push" || c.purpose === "email")
        cancelReminders(s.user.id, c.purpose);
    }
    return accountData(s.user.id, s.user.name);
  });
  app.post("/api/measures", async (req) => {
    const s = await owner(req);
    if (!consent(s.user.id, "body"))
      fail("Le suivi corporel est désactivé.", 403);
    const m = z
      .object({
        name: z.string().trim().min(1).max(40),
        unit: z.string().trim().min(1).max(12),
      })
      .parse(req.body);
    if (getMeasures(s.user.id).length >= 45)
      fail("Vous pouvez créer jusqu’à 30 mesures personnalisées.");
    const id = randomUUID();
    db.prepare("INSERT INTO measures VALUES (?, ?, ?, ?, 0)").run(
      id,
      s.user.id,
      m.name,
      m.unit,
    );
    return { id, ...m, custom: true };
  });
  app.patch("/api/measures/:id", async (req) => {
    const s = await owner(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const m = z
      .object({
        name: z.string().trim().min(1).max(40),
        unit: z.string().trim().min(1).max(12),
        archived: z.boolean(),
      })
      .parse(req.body);
    const existing = db
      .prepare("SELECT unit FROM measures WHERE id = ? AND user_id = ?")
      .get(id, s.user.id) as any;
    if (!existing) fail("Mesure introuvable.", 404);
    if (
      m.unit !== existing.unit &&
      getEntries(s.user.id).some((e) => e.values[id] !== undefined)
    )
      fail(
        "L’unité d’une mesure ayant un historique ne peut pas être changée.",
      );
    db.prepare(
      "UPDATE measures SET name = ?, unit = ?, archived = ? WHERE id = ? AND user_id = ?",
    ).run(m.name, m.unit, Number(m.archived), id, s.user.id);
    return { ok: true };
  });
  const saveEntry = async (req: FastifyRequest) => {
    const s = await owner(req);
    const userId = s.user.id;
    if (!consent(userId, "body")) fail("Le suivi corporel est désactivé.", 403);
    const entryId = (req.params as { id?: string })?.id;
    if (
      entryId &&
      !db
        .prepare("SELECT id FROM entries WHERE id = ? AND user_id = ?")
        .get(entryId, userId)
    )
      fail("Entrée introuvable.", 404);
    const e = z
      .object({
        date: dateSchema,
        values: z.record(
          z.string(),
          z.number().finite().positive().max(100000),
        ),
        note: z.string().max(2000).default(""),
        height: z.number().positive().max(300).nullable(),
        requestId: z.uuid(),
        tools: toolContextSchema.optional(),
      })
      .parse(req.body);
    const tz =
      (
        db
          .prepare("SELECT timezone FROM profiles WHERE user_id = ?")
          .get(userId) as any
      )?.timezone || "Europe/Paris";
    if (e.date > localDate(tz)) fail("La date ne peut pas être dans le futur.");
    const dateIssue = toolDateIssue(
      e.tools ??
        (entryId
          ? getEntries(userId).find((x) => x.id === entryId)?.tools
          : undefined),
      e.date,
    );
    if (dateIssue) fail(dateIssue);
    const allowed = getMeasures(userId)
      .filter(
        (m) =>
          !m.archived ||
          (entryId &&
            getEntries(userId).find((x) => x.id === entryId)?.values[m.id] !==
              undefined),
      )
      .map((m) => m.id);
    if (Object.keys(e.values).some((id) => !allowed.includes(id)))
      fail("Mesure inconnue ou archivée.");
    if (!Object.keys(e.values).length && !e.note.trim())
      fail("Ajoutez au moins une mesure ou une note.");
    const duplicate =
      !entryId &&
      (db
        .prepare("SELECT id FROM entries WHERE user_id = ? AND request_id = ?")
        .get(userId, e.requestId) as any);
    if (duplicate) return getEntries(userId).find((x) => x.id === duplicate.id);
    const id = entryId || randomUUID();
    const now = new Date().toISOString();
    db.transaction(() => {
      if (!consent(userId, "body"))
        fail("Le consentement a changé. Vérifiez vos réglages.", 403);
      if (entryId)
        db.prepare(
          "UPDATE entries SET date = ?, height = ?, values_json = ?, note = ?, updated_at = ? WHERE id = ? AND user_id = ?",
        ).run(
          e.date,
          e.height,
          JSON.stringify(e.values),
          e.note,
          now,
          id,
          userId,
        );
      else
        db.prepare(
          "INSERT INTO entries (id,user_id,date,height,values_json,note,created_at,updated_at,request_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).run(
          id,
          userId,
          e.date,
          e.height,
          JSON.stringify(e.values),
          e.note,
          now,
          now,
          e.requestId,
        );
      if (e.tools !== undefined)
        db.prepare(
          "UPDATE entries SET tools_json = ? WHERE id = ? AND user_id = ?",
        ).run(JSON.stringify(e.tools), id, userId);
    })();
    return getEntries(userId).find((x) => x.id === id);
  };
  app.post(
    "/api/entries",
    { config: { rateLimit: { max: 30, timeWindow: "5 minutes" } } },
    saveEntry,
  );
  app.put(
    "/api/entries/:id",
    { config: { rateLimit: { max: 30, timeWindow: "5 minutes" } } },
    saveEntry,
  );
  app.delete("/api/entries/:id", async (req) => {
    const s = await owner(req);
    const { id } = z.object({ id: z.string() }).parse(req.params);
    if (
      !db
        .prepare("SELECT id FROM entries WHERE id = ? AND user_id = ?")
        .get(id, s.user.id)
    )
      fail("Entrée introuvable.", 404);
    deletePhotos(s.user.id, id);
    db.prepare("DELETE FROM entries WHERE id = ? AND user_id = ?").run(
      id,
      s.user.id,
    );
    return { ok: true };
  });
  app.put("/api/goal", async (req) => {
    const s = await owner(req);
    if (!consent(s.user.id, "body"))
      fail("Le suivi corporel est désactivé.", 403);
    const g = z
      .object({
        measureId: z.string(),
        start: z.number().positive(),
        target: z.number().positive(),
        startDate: dateSchema,
      })
      .parse(req.body);
    if (
      !getMeasures(s.user.id).some((m) => m.id === g.measureId && !m.archived)
    )
      fail("Mesure inconnue.");
    db.prepare(
      "INSERT INTO goals VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET measure_id=excluded.measure_id, start=excluded.start, target=excluded.target, start_date=excluded.start_date",
    ).run(s.user.id, g.measureId, g.start, g.target, g.startDate);
    return g;
  });
  app.delete("/api/goal", async (req) => {
    const s = await owner(req);
    db.prepare("DELETE FROM goals WHERE user_id = ?").run(s.user.id);
    return { ok: true };
  });
  app.post("/api/subscriptions", async (req) => {
    const s = await owner(req);
    if (!pushConfigured)
      fail("Les notifications ne sont pas configurées sur le serveur.", 503);
    if (!consent(s.user.id, "push") || !consent(s.user.id, "body"))
      fail("Le consentement aux notifications est nécessaire.", 403);
    const sub = z
      .object({
        endpoint: z.url().max(2000),
        expirationTime: z.number().nullable().optional(),
        keys: z.object({
          p256dh: z.string().regex(/^[A-Za-z0-9_-]{80,100}$/),
          auth: z.string().regex(/^[A-Za-z0-9_-]{20,30}$/),
        }),
      })
      .parse(req.body);
    const url = new URL(sub.endpoint);
    const domains = [
      "fcm.googleapis.com",
      "updates.push.services.mozilla.com",
      "web.push.apple.com",
      "notify.windows.com",
    ];
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      !domains.some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`))
    )
      fail("Ce fournisseur de notifications n’est pas pris en charge.");
    const old = db
      .prepare("SELECT user_id FROM subscriptions WHERE endpoint = ?")
      .get(sub.endpoint) as any;
    if (old && old.user_id !== s.user.id)
      fail(
        "Cet appareil est associé à un autre compte. Désabonnez-le avant de changer de compte.",
      );
    db.prepare(
      "INSERT INTO subscriptions VALUES (?, ?, ?, ?, ?) ON CONFLICT(endpoint) DO UPDATE SET data=excluded.data",
    ).run(
      randomUUID(),
      s.user.id,
      sub.endpoint,
      JSON.stringify(sub),
      new Date().toISOString(),
    );
    return { ok: true };
  });
  app.delete("/api/subscriptions", async (req) => {
    const s = await owner(req);
    const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
    db.prepare(
      "DELETE FROM subscriptions WHERE endpoint = ? AND user_id = ?",
    ).run(endpoint, s.user.id);
    return { ok: true };
  });
  app.put("/api/reminder", async (req) => {
    const s = await owner(req);
    const r = z
      .object({
        enabled: z.boolean(),
        weekday: z.number().int().min(1).max(7),
        weekdays: z
          .array(z.number().int().min(1).max(7))
          .min(1)
          .max(7)
          .optional(),
        frequency: z.enum(["week", "fortnight", "month"]),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        timezone: zoneSchema,
        channel: z.enum(["push", "email"]),
      })
      .parse(req.body);
    r.weekdays = reminderDays(r);
    if (r.enabled) {
      if (!consent(s.user.id, "body") || !consent(s.user.id, r.channel))
        fail("Activez le consentement au canal choisi.", 403);
      if (
        r.channel === "push" &&
        (!pushConfigured ||
          !(
            db
              .prepare(
                "SELECT COUNT(*) AS n FROM subscriptions WHERE user_id = ?",
              )
              .get(s.user.id) as any
          ).n)
      )
        fail("Configurez un appareil pour les notifications.");
      if (r.channel === "email" && !emailConfigured)
        fail("Le canal email n’est pas configuré.");
    }
    const previous = getReminder(s.user.id);
    const sameRule =
      previous &&
      previous.weekday === r.weekday &&
      previous.frequency === r.frequency &&
      previous.time === r.time &&
      previous.timezone === r.timezone &&
      (r.frequency !== "week" ||
        JSON.stringify(reminderDays(previous)) === JSON.stringify(r.weekdays));
    const anchor = sameRule ? previous.anchor : reminderAnchor(r);
    const reminder: Reminder = { ...r, anchor };
    const next = r.enabled
      ? nextOccurrences(reminder, DateTime.now(), 1)[0]
      : null;
    db.prepare(
      "INSERT INTO reminders (user_id,enabled,weekday,frequency,time,timezone,anchor,channel,next_at,revision,weekdays) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET enabled=excluded.enabled, weekday=excluded.weekday, frequency=excluded.frequency, time=excluded.time, timezone=excluded.timezone, anchor=excluded.anchor, channel=excluded.channel, next_at=excluded.next_at, revision=excluded.revision, weekdays=excluded.weekdays",
    ).run(
      s.user.id,
      Number(r.enabled),
      r.weekday,
      r.frequency,
      r.time,
      r.timezone,
      anchor,
      r.channel,
      next,
      randomUUID(),
      JSON.stringify(r.weekdays),
    );
    return { ...reminder, nextAt: next };
  });
  app.post(
    "/api/export",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const s = await owner(req);
      const opts = z
        .object({
          format: z.enum(["json", "csv", "zip"]),
        })
        .parse(req.body);
      const data = accountData(s.user.id, s.user.name);
      const audit = db
        .prepare(
          "SELECT purpose, version, text, granted, created_at FROM consents WHERE user_id = ?",
        )
        .all(s.user.id);
      const exported = {
        application: APP_NAME,
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        account: { id: s.user.id, email: s.user.email },
        ...data,
        consentHistory: audit,
      };
      const csv = accountCsv(data);
      reply.header(
        "Content-Disposition",
        `attachment; filename="${APP_SLUG}-${localDate()}.${opts.format}"`,
      );
      if (opts.format === "json")
        return reply
          .type("application/json")
          .send(JSON.stringify(exported, null, 2));
      if (opts.format === "csv")
        return reply.type("text/csv; charset=utf-8").send(csv);
      const stream = new PassThrough();
      const zip = new ZipArchive({ zlib: { level: 6 } });
      zip.on("error", () => stream.destroy(new Error("Export interrompu.")));
      zip.pipe(stream);
      zip.append(JSON.stringify(exported, null, 2), { name: "donnees.json" });
      zip.append(csv, { name: "mesures.csv" });
      void zip.finalize();
      return reply.type("application/zip").send(stream);
    },
  );
  app.delete(
    "/api/account",
    { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } },
    async (req) => {
      const s = await owner(req);
      const { password } = z
        .object({ password: z.string().min(1).max(128) })
        .parse(req.body);
      try {
        await auth.api.verifyPassword({
          headers: fromNodeHeaders(req.headers),
          body: { password },
        });
      } catch {
        fail("Le mot de passe ne correspond pas.", 403);
      }
      eraseAccount(s.user.id);
      return { ok: true };
    },
  );
  if (existsSync(resolve("dist/index.html"))) {
    await app.register(fastifyStatic, {
      root: resolve("dist"),
      wildcard: false,
    });
    app.setNotFoundHandler((req, reply) =>
      req.url.startsWith("/api/")
        ? reply.status(404).send({ error: "Ressource introuvable." })
        : reply.sendFile("index.html"),
    );
  }
  return app;
}
