import { avatarSchema } from "./avatar.ts";
import { z } from "zod";
import { DateTime } from "luxon";
import { STANDARD_MEASURES, DEFAULT_VISIBLE } from "./catalog.ts";
import { CONSENT_TEXTS, CONSENT_VERSION } from "./config.ts";
import { firstOccurrence, nextOccurrences } from "./recurrence.ts";
import { onboardingSchema } from "./onboarding.ts";
import type {
  AccountData,
  Capabilities,
  ConsentPurpose,
  Entry,
  Photo,
} from "./types.ts";

export interface CloudAccount extends AccountData {
  audit: {
    purpose: ConsentPurpose;
    granted: boolean;
    version: string;
    text: string;
    date: string;
  }[];
  subscriptions: {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  }[];
  requestIds: Record<string, string>;
  reminderRevision: string;
}
export function emptyCloudAccount(
  name: string,
  timezone = "UTC",
): CloudAccount {
  return {
    profile: {
      onboardingCompleted: false,
      name: name || "Mon espace",
      height: null,
      timezone: DateTime.now().setZone(timezone).isValid ? timezone : "UTC",
      visible: [...DEFAULT_VISIBLE],
    },
    measures: structuredClone(STANDARD_MEASURES),
    entries: [],
    goal: null,
    consents: { body: false, photos: false, push: false, email: false },
    reminder: null,
    devices: 0,
    subscriptions: [],
    audit: [],
    requestIds: {},
    reminderRevision: "",
  };
}
export function publicCloudAccount(a: CloudAccount): AccountData {
  const { profile, entries, measures, goal, consents, reminder } = a;
  return {
    profile: {
      ...profile,
      onboardingCompleted:
        profile.onboardingCompleted ??
        Boolean(profile.height || entries.length),
    },
    entries,
    measures,
    goal,
    consents,
    reminder,
    devices: a.subscriptions.length,
  };
}
export function cloudFail(message: string, statusCode = 400): never {
  throw Object.assign(new Error(message), { statusCode });
}
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => DateTime.fromISO(d).isValid);
const zone = z
  .string()
  .max(100)
  .refine((v) => DateTime.now().setZone(v).isValid);
const values = z.record(z.string(), z.number().finite().positive().max(100000));
const hasContent = (e: Entry) =>
  Object.keys(e.values).length || e.note.trim() || e.photos.length;
export const photoIds = (a: CloudAccount) =>
  a.entries.flatMap((e) => e.photos.map((p) => p.id));

// Pure rules are shared by the cloud API and tests. A revision check commits all
// changes together; a concurrent withdrawal causes these rules to run again.
export function mutateCloudAccount(
  input: CloudAccount,
  method: string,
  path: string,
  raw: unknown,
  caps: Capabilities,
  uploads: Photo[] = [],
  now: DateTime = DateTime.now(),
) {
  const a = structuredClone(input);
  a.profile.onboardingCompleted ??= Boolean(
    a.profile.height || a.entries.length,
  );
  let result: unknown = { ok: true };
  const [, resource, id] = path.split("/");
  const bodyRequired = () => {
    if (!a.consents.body) cloudFail("Le suivi corporel est désactivé.", 403);
  };
  if (resource === "onboarding" && method === "POST") {
    const setup = onboardingSchema.parse(raw);
    if (
      setup.goal &&
      !a.measures.some((m) => m.id === setup.goal!.measureId && !m.archived)
    )
      cloudFail("Mesure inconnue.");
    if (!a.consents.body) {
      a.consents.body = true;
      a.audit.unshift({
        purpose: "body",
        granted: true,
        version: setup.version,
        text: CONSENT_TEXTS.body,
        date: now.toISO()!,
      });
    }
    a.profile.height = setup.height;
    a.profile.onboardingCompleted = true;
    a.goal = setup.goal
      ? {
          ...setup.goal,
          startDate: now.setZone(a.profile.timezone).toISODate()!,
        }
      : null;
    result = publicCloudAccount(a);
  } else if (resource === "profile" && method === "PATCH") {
    const p = z
      .object({
        avatar: avatarSchema,
        name: z.string().trim().min(1).max(100),
        height: z.number().positive().max(300).nullable(),
        timezone: zone,
        visible: z.array(z.string()).max(40),
      })
      .parse(raw);
    if (p.height !== null) bodyRequired();
    if (
      new Set(p.visible).size !== p.visible.length ||
      p.visible.some(
        (v) =>
          !a.measures.some(
            (m) => m.id === v && m.id !== "weight" && !m.archived,
          ),
      )
    )
      cloudFail("Sélection de mesures invalide.");
    a.profile = { ...a.profile, ...p };
    result = publicCloudAccount(a);
  } else if (resource === "consents" && method === "POST") {
    const c = z
      .object({
        purpose: z.enum(["body", "photos", "push", "email"]),
        granted: z.boolean(),
        version: z.literal(CONSENT_VERSION),
      })
      .parse(raw);
    if (c.granted && c.purpose !== "body") bodyRequired();
    const record = (purpose: ConsentPurpose, granted: boolean) => {
      a.consents[purpose] = granted;
      a.audit.unshift({
        purpose,
        granted,
        version: c.version,
        text: CONSENT_TEXTS[purpose],
        date: now.toISO()!,
      });
    };
    record(c.purpose, c.granted);
    if (!c.granted) {
      if (c.purpose === "photos")
        a.entries = a.entries
          .map((e) => ({ ...e, photos: [] }))
          .filter(hasContent);
      if (c.purpose === "push") a.subscriptions = [];
      if (c.purpose === "body") {
        a.entries = [];
        a.goal = null;
        a.profile.height = null;
        a.subscriptions = [];
        a.requestIds = {};
        for (const p of ["photos", "push", "email"] as const)
          if (a.consents[p]) record(p, false);
      }
      if (
        a.reminder &&
        (c.purpose === "body" || a.reminder.channel === c.purpose)
      )
        a.reminder = { ...a.reminder, enabled: false, nextAt: null };
      a.reminderRevision = crypto.randomUUID();
    }
    result = publicCloudAccount(a);
  } else if (resource === "measures" && method === "POST") {
    bodyRequired();
    const m = z
      .object({
        name: z.string().trim().min(1).max(40),
        unit: z.string().trim().min(1).max(12),
      })
      .parse(raw);
    if (a.measures.length >= 45)
      cloudFail("Vous pouvez créer jusqu’à 30 mesures personnalisées.");
    result = { ...m, id: crypto.randomUUID(), custom: true };
    a.measures.push(result as any);
  } else if (resource === "measures" && method === "PATCH" && id) {
    bodyRequired();
    const m = z
      .object({
        name: z.string().trim().min(1).max(40),
        unit: z.string().trim().min(1).max(12),
        archived: z.boolean(),
      })
      .parse(raw);
    const existing = a.measures.find((m) => m.id === id && m.custom);
    if (!existing) cloudFail("Mesure introuvable.", 404);
    if (
      m.unit !== existing.unit &&
      a.entries.some((e) => e.values[id] !== undefined)
    )
      cloudFail(
        "L’unité d’une mesure ayant un historique ne peut pas être changée.",
      );
    Object.assign(existing, m);
    if (m.archived)
      a.profile.visible = a.profile.visible.filter((v) => v !== id);
  } else if (
    resource === "entries" &&
    (method === "POST" || method === "PUT")
  ) {
    bodyRequired();
    const e = z
      .object({
        date,
        values,
        note: z.string().max(2000).default(""),
        height: z.number().positive().max(300).nullable(),
        requestId: z.uuid(),
      })
      .parse(raw);
    if (e.date > now.setZone(a.profile.timezone).toISODate()!)
      cloudFail("La date ne peut pas être dans le futur.");
    const old = id ? a.entries.find((e) => e.id === id) : undefined;
    if (id && !old) cloudFail("Entrée introuvable.", 404);
    if (uploads.length && !a.consents.photos)
      cloudFail("Acceptez le stockage privé des photos avant leur envoi.", 403);
    if (new Set(uploads.map((p) => p.orientation)).size !== uploads.length)
      cloudFail("Une seule photo par orientation est autorisée.");
    if (
      Object.keys(e.values).some(
        (v) =>
          !a.measures.some(
            (m) => m.id === v && (!m.archived || old?.values[v] !== undefined),
          ),
      )
    )
      cloudFail("Mesure inconnue ou archivée.");
    const duplicate =
      !id && a.entries.find((x) => x.id === a.requestIds[e.requestId]);
    if (duplicate) return { account: a, result: duplicate };
    const entryId = id || crypto.randomUUID();
    const photos = [
      ...(old?.photos || []).filter(
        (p) => !uploads.some((u) => u.orientation === p.orientation),
      ),
      ...uploads.map((p) => ({ ...p, entryId })),
    ];
    const entry: Entry = {
      id: entryId,
      date: e.date,
      values: e.values,
      note: e.note,
      height: e.height,
      createdAt: old?.createdAt || now.toISO()!,
      photos,
    };
    if (!hasContent(entry))
      cloudFail("Ajoutez au moins une mesure, une note ou une photo.");
    a.entries = [entry, ...a.entries.filter((x) => x.id !== entryId)].sort(
      (x, y) =>
        y.date.localeCompare(x.date) || y.createdAt.localeCompare(x.createdAt),
    );
    a.requestIds[e.requestId] = entryId;
    result = entry;
  } else if (resource === "entries" && method === "DELETE") {
    if (!a.entries.some((e) => e.id === id))
      cloudFail("Entrée introuvable.", 404);
    a.entries = a.entries.filter((e) => e.id !== id);
    a.requestIds = Object.fromEntries(
      Object.entries(a.requestIds).filter(([, v]) => v !== id),
    );
  } else if (resource === "photos" && method === "DELETE") {
    if (!photoIds(a).includes(id)) cloudFail("Photo introuvable.", 404);
    a.entries = a.entries
      .map((e) => ({ ...e, photos: e.photos.filter((p) => p.id !== id) }))
      .filter(hasContent);
  } else if (resource === "goal" && method === "PUT") {
    bodyRequired();
    const g = z
      .object({
        measureId: z.string(),
        start: z.number().finite().positive().max(100000),
        target: z.number().finite().positive().max(100000),
        startDate: date,
      })
      .parse(raw);
    if (!a.measures.some((m) => m.id === g.measureId && !m.archived))
      cloudFail("Mesure inconnue.");
    a.goal = g;
    result = g;
  } else if (resource === "goal" && method === "DELETE") a.goal = null;
  else if (resource === "subscriptions" && method === "POST") {
    bodyRequired();
    if (!a.consents.push)
      cloudFail("Le consentement aux notifications est nécessaire.", 403);
    if (!caps.pushConfigured)
      cloudFail(
        "Les notifications ne sont pas configurées sur le serveur.",
        503,
      );
    const s = z
      .object({
        endpoint: z.url().max(2000),
        expirationTime: z.number().nullable().optional(),
        keys: z.object({
          p256dh: z.string().regex(/^[A-Za-z0-9_-]{80,100}$/),
          auth: z.string().regex(/^[A-Za-z0-9_-]{20,30}$/),
        }),
      })
      .parse(raw);
    const url = new URL(s.endpoint);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      ![
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
        "notify.windows.com",
      ].some((d) => url.hostname === d || url.hostname.endsWith(`.${d}`))
    )
      cloudFail("Ce fournisseur de notifications n’est pas pris en charge.");
    a.subscriptions = [
      ...a.subscriptions.filter((v) => v.endpoint !== s.endpoint),
      s,
    ];
    if (a.subscriptions.length > 10)
      cloudFail("Dix appareils maximum par compte.");
  } else if (resource === "subscriptions" && method === "DELETE") {
    const s = z.object({ endpoint: z.string() }).parse(raw);
    a.subscriptions = a.subscriptions.filter((v) => v.endpoint !== s.endpoint);
  } else if (resource === "reminder" && method === "PUT") {
    const r = z
      .object({
        enabled: z.boolean(),
        weekday: z.number().int().min(1).max(7),
        frequency: z.enum(["week", "fortnight", "month"]),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        timezone: zone,
        channel: z.enum(["push", "email"]),
      })
      .parse(raw);
    if (r.enabled) {
      bodyRequired();
      if (!a.consents[r.channel])
        cloudFail("Activez le consentement au canal choisi.", 403);
      if (
        r.channel === "push" &&
        (!caps.pushConfigured || !a.subscriptions.length)
      )
        cloudFail("Activez les notifications sur cet appareil.");
      if (r.channel === "email" && !caps.emailConfigured)
        cloudFail("Le canal email n’est pas configuré.");
    }
    const old = a.reminder;
    const same =
      old &&
      ["weekday", "frequency", "time", "timezone"].every(
        (k) => (old as any)[k] === (r as any)[k],
      );
    const reminder = {
      ...r,
      anchor: same
        ? old.anchor
        : firstOccurrence(r.weekday, r.time, r.timezone, now),
      nextAt: null as string | null,
    };
    reminder.nextAt = r.enabled
      ? nextOccurrences(reminder, now, 1)[0] || null
      : null;
    a.reminder = reminder;
    a.reminderRevision = crypto.randomUUID();
    result = reminder;
  } else cloudFail("Cette action est introuvable.", 404);
  a.devices = a.subscriptions.length;
  return { account: a, result };
}

export async function cloudCommit<T>(
  load: () => Promise<{ revision: number; data: CloudAccount }>,
  commit: (revision: number, data: CloudAccount) => Promise<boolean>,
  change: (account: CloudAccount) => { account: CloudAccount; result: T },
) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await load();
    const next = change(current.data);
    if (await commit(current.revision, next.account))
      return { ...next, previous: current.data };
  }
  cloudFail("Vos réglages ont changé pendant la sauvegarde. Réessayez.", 409);
}
