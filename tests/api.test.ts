import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import webpush from "web-push";
import { unzipSync } from "fflate";
import { DateTime } from "luxon";
import type { FastifyInstance } from "fastify";
import { CONSENT_VERSION } from "../shared/config";
let app: FastifyInstance;
let db: any;
let dir: string;
let alice: { cookie: string; id: string };
let bob: { cookie: string; id: string };
let entryId: string;
let customId: string;
const initialPassword = "abc123";
const headers = (cookie = "") => ({
  origin: "http://localhost:5173",
  "x-requested-with": "Mesura",
  cookie,
});
async function call(
  method: any,
  path: string,
  payload?: any,
  cookie = alice?.cookie,
) {
  return app.inject({
    method,
    url: path,
    headers: headers(cookie),
    ...(payload !== undefined ? { payload } : {}),
  });
}
async function account(email: string) {
  const signup = await call(
    "POST",
    "/api/auth/sign-up/email",
    { name: email.split("@")[0], email, password: initialPassword },
    "",
  );
  expect(signup.statusCode).toBe(200);
  expect(
    db.prepare("SELECT url FROM dev_mail WHERE email = ?").get(email),
  ).toBeUndefined();
  const cookies = signup.cookies
    .filter((c) => c.value)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  const session = await call(
    "GET",
    "/api/auth/get-session",
    undefined,
    cookies,
  );
  expect(session.json().user.email).toBe(email);
  expect(
    (await call("GET", "/api/account", undefined, cookies)).statusCode,
  ).toBe(200);
  return { cookie: cookies, id: session.json().user.id };
}
beforeAll(async () => {
  dir = mkdtempSync(resolve(tmpdir(), "mesura-test-"));
  process.env.DATA_DIR = dir;
  process.env.NODE_ENV = "test";
  process.env.APP_URL = "http://localhost:5173";
  const keys = webpush.generateVAPIDKeys();
  process.env.VAPID_PUBLIC_KEY = keys.publicKey;
  process.env.VAPID_PRIVATE_KEY = keys.privateKey;
  process.env.VAPID_SUBJECT = "mailto:test@example.test";
  const m = await import("../server/app");
  db = (await import("../server/db")).db;
  app = await m.buildApp();
  alice = await account("alice@example.test");
  bob = await account("bob@example.test");
});
afterAll(async () => {
  await app?.close();
  db?.close();
  rmSync(dir, { recursive: true, force: true });
});
describe("Comptes et contrôle d’accès", () => {
  it("refuse cinq caractères et accepte six pour un nouveau mot de passe", async () => {
    const payload = {
      name: "Limite",
      email: "limite@example.test",
      password: "abc12",
    };
    const short = await call("POST", "/api/auth/sign-up/email", payload, "");
    expect(short.statusCode).toBe(400);
    expect(short.json().code).toBe("PASSWORD_TOO_SHORT");
    // Les deux comptes du beforeAll ont été créés et connectés directement avec six caractères.
  });
  it("expose la santé du serveur sans donnée privée", async () => {
    const r = await call("GET", "/api/health", undefined, "");
    expect(r.statusCode).toBe(200);
    expect(r.json()).toEqual({ status: "ok" });
    expect(r.headers["cache-control"]).toBe("no-store, private");
  });
  it("refuse les requêtes anonymes et les origines tierces", async () => {
    expect((await call("GET", "/api/account", undefined, "")).statusCode).toBe(
      401,
    );
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/entries",
          headers: { ...headers(alice.cookie), origin: "https://evil.example" },
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/entries",
          headers: { origin: "http://localhost:5173", cookie: alice.cookie },
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
  });
  it("commence sans consentement ni données", async () => {
    const data = (await call("GET", "/api/account")).json();
    expect(data.entries).toEqual([]);
    expect(Object.values(data.consents)).toEqual([false, false, false, false]);
    expect(
      (
        await call("POST", "/api/entries", {
          date: "2026-09-01",
          values: { weight: 78 },
          height: 175,
          note: "",
          requestId: crypto.randomUUID(),
        })
      ).statusCode,
    ).toBe(403);
  });
  it("valide tout le démarrage avant d’autoriser et sauvegarde le choix sans cible", async () => {
    const setup = {
      height: 175.5,
      consent: true,
      version: CONSENT_VERSION,
      goal: null,
    };
    expect((await call("POST", "/api/onboarding", setup, "")).statusCode).toBe(
      401,
    );
    expect(
      (await call("POST", "/api/onboarding", { ...setup, consent: false }))
        .statusCode,
    ).toBe(400);
    expect(
      (await call("POST", "/api/onboarding", { ...setup, height: 301 }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await call("POST", "/api/onboarding", {
          ...setup,
          goal: { measureId: "unknown", start: 80, target: 70 },
        })
      ).statusCode,
    ).toBe(400);
    let current = (await call("GET", "/api/account")).json();
    expect(current.consents.body).toBe(false);
    expect(current.profile.height).toBeNull();
    const response = await call("POST", "/api/onboarding", setup);
    expect(response.statusCode).toBe(200);
    current = (await call("GET", "/api/account")).json();
    expect(current.profile).toMatchObject({
      height: 175.5,
      onboardingCompleted: true,
    });
    expect(current.consents).toEqual({
      body: true,
      photos: false,
      push: false,
      email: false,
    });
    expect(current.entries).toEqual([]);
    expect(current.goal).toBeNull();
  });
  it("enregistre un consentement traçable puis des valeurs persistantes", async () => {
    await call("POST", "/api/consents", {
      purpose: "body",
      granted: true,
      version: CONSENT_VERSION,
    });
    await call(
      "POST",
      "/api/consents",
      { purpose: "body", granted: true, version: CONSENT_VERSION },
      bob.cookie,
    );
    const payload = {
      date: "2026-09-01",
      values: { weight: 78.4, waist: 84, hips: 100 },
      height: 175,
      note: "<script>test</script>",
      requestId: crypto.randomUUID(),
    };
    const response = await call("POST", "/api/entries", payload);
    expect(response.statusCode).toBe(200);
    entryId = response.json().id;
    const duplicate = await call("POST", "/api/entries", payload);
    expect(duplicate.json().id).toBe(entryId);
    expect((await call("GET", "/api/account")).json().entries).toHaveLength(1);
    expect((await call("GET", "/api/consents")).json()[0]).toMatchObject({
      purpose: "body",
      version: CONSENT_VERSION,
      granted: 1,
    });
  });
  it("refuse les identifiants d’un autre compte pour lecture et écriture", async () => {
    expect(
      (await call("GET", "/api/account", undefined, bob.cookie)).json().entries,
    ).toHaveLength(0);
    expect(
      (
        await call(
          "PUT",
          `/api/entries/${entryId}`,
          {
            date: "2026-09-02",
            values: { weight: 70 },
            height: 180,
            note: "",
            requestId: crypto.randomUUID(),
          },
          bob.cookie,
        )
      ).statusCode,
    ).toBe(404);
    expect(
      (await call("DELETE", `/api/entries/${entryId}`, undefined, bob.cookie))
        .statusCode,
    ).toBe(404);
  });
  it("valide les valeurs absentes, dates et entrées vides", async () => {
    for (const values of [{ weight: 0 }, { weight: -1 }, { unknown: 78 }])
      expect(
        (
          await call("POST", "/api/entries", {
            date: "2026-09-01",
            values,
            height: null,
            note: "",
            requestId: crypto.randomUUID(),
          })
        ).statusCode,
      ).toBe(400);
    expect(
      (
        await call("POST", "/api/entries", {
          date: "2026-02-31",
          values: { weight: 70 },
          height: null,
          note: "",
          requestId: crypto.randomUUID(),
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call("POST", "/api/entries", {
          date: "2026-09-01",
          values: {},
          height: null,
          note: " ",
          requestId: crypto.randomUUID(),
        })
      ).statusCode,
    ).toBe(400);
  });
  it("modifie l’entrée et garde la stature historique après changement du profil", async () => {
    await call("PATCH", "/api/profile", {
      name: "Alice",
      height: 180,
      timezone: "Europe/Paris",
      visible: ["waist", "hips"],
    });
    const data = (await call("GET", "/api/account")).json();
    expect(data.profile.height).toBe(180);
    expect(data.entries[0].height).toBe(175);
    const r = await call("PUT", `/api/entries/${entryId}`, {
      date: "2026-09-01",
      values: { weight: 79, waist: 84, hips: 100 },
      height: 175,
      note: "Une note privée",
      requestId: crypto.randomUUID(),
    });
    expect(r.json().values.weight).toBe(79);
  });
  it("permet une note sans mesure et préserve les absences", async () => {
    const r = await call("POST", "/api/entries", {
      date: "2026-09-03",
      values: {},
      height: null,
      note: "Un repère de ressenti",
      requestId: crypto.randomUUID(),
    });
    expect(r.statusCode).toBe(200);
    expect(r.json().values.weight).toBeUndefined();
  });
  it("isole les mesures personnalisées et leur unité historique", async () => {
    const r = await call("POST", "/api/measures", {
      name: "Poignet",
      unit: "cm",
    });
    customId = r.json().id;
    expect(
      (
        await call(
          "PATCH",
          `/api/measures/${customId}`,
          { name: "Autre", unit: "cm", archived: true },
          bob.cookie,
        )
      ).statusCode,
    ).toBe(404);
    await call("POST", "/api/entries", {
      date: "2026-09-04",
      values: { [customId]: 16 },
      height: null,
      note: "",
      requestId: crypto.randomUUID(),
    });
    expect(
      (
        await call("PATCH", `/api/measures/${customId}`, {
          name: "Poignet",
          unit: "mm",
          archived: false,
        })
      ).statusCode,
    ).toBe(400);
  });
  it("isole objectifs et rappels", async () => {
    await call("PUT", "/api/goal", {
      measureId: "weight",
      start: 79,
      target: 85,
      startDate: "2026-09-01",
    });
    expect(
      (await call("GET", "/api/account", undefined, bob.cookie)).json().goal,
    ).toBeNull();
    expect(
      (
        await call("PUT", "/api/reminder", {
          enabled: true,
          weekday: 1,
          frequency: "fortnight",
          time: "08:00",
          timezone: "Europe/Paris",
          channel: "push",
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await call("PUT", "/api/reminder", {
          enabled: false,
          weekday: 1,
          frequency: "fortnight",
          time: "08:00",
          timezone: "Europe/Paris",
          channel: "push",
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (await call("GET", "/api/account", undefined, bob.cookie)).json()
        .reminder,
    ).toBeNull();
  });
  it("refuse la réactivation des photos et ignore les anciens champs de profil", async () => {
    const response = await call("POST", "/api/consents", {
      purpose: "photos",
      granted: true,
      version: CONSENT_VERSION,
    });
    expect(response.statusCode).toBe(410);
    const profile = (await call("GET", "/api/account")).json().profile;
    const updated = await call("PATCH", "/api/profile", {
      ...profile,
      avatar: "data:image/jpeg;base64,/9j/2Q==",
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().profile.avatar).toBeUndefined();
    expect(
      db.prepare("SELECT avatar FROM profiles WHERE user_id = ?").get(alice.id)
        .avatar,
    ).toBeNull();
    expect((await call("GET", "/api/photos/ancienne-photo")).statusCode).toBe(
      404,
    );
  });
  it("refuse les envois de fichiers sans créer d’entrée", async () => {
    const before = (await call("GET", "/api/account")).json().entries.length;
    const form = new FormData();
    form.set(
      "data",
      JSON.stringify({
        date: "2026-09-06",
        values: { weight: 77 },
        height: 175,
        note: "",
        requestId: crypto.randomUUID(),
      }),
    );
    form.set(
      "face",
      new Blob(["not an image"], { type: "image/jpeg" }),
      "fake.jpg",
    );
    const request = new Request("http://localhost/upload", {
      method: "POST",
      body: form,
    });
    const r = await app.inject({
      method: "POST",
      url: "/api/entries",
      headers: {
        ...headers(alice.cookie),
        "content-type": request.headers.get("content-type")!,
      },
      payload: Buffer.from(await request.arrayBuffer()),
    });
    expect(r.statusCode).toBe(415);
    expect((await call("GET", "/api/account")).json().entries.length).toBe(
      before,
    );
  });
  it("exporte exclusivement les données de l’utilisateur authentifié", async () => {
    const json = (await call("POST", "/api/export", { format: "json" })).json();
    expect(json.account.id).toBe(alice.id);
    expect(json.entries.length).toBeGreaterThan(0);
    expect(json.entries.some((e: any) => e.note === "Une note privée")).toBe(
      true,
    );
    const bobExport = (
      await call("POST", "/api/export", { format: "json" }, bob.cookie)
    ).json();
    expect(bobExport.entries).toHaveLength(0);
    const zip = await call("POST", "/api/export", {
      format: "zip",
    });
    expect(zip.statusCode).toBe(200);
    expect(zip.rawPayload.subarray(0, 2).toString()).toBe("PK");
  });
  it("isole les abonnements, évite les doubles envois et respecte le retrait à l’exécution", async () => {
    const keys = { p256dh: "A".repeat(87), auth: "B".repeat(22) };
    const aliceSub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/alice-device",
      keys,
    };
    const bobSub = {
      endpoint: "https://fcm.googleapis.com/fcm/send/bob-device",
      keys,
    };
    for (const user of [alice, bob])
      await call(
        "POST",
        "/api/consents",
        { purpose: "push", granted: true, version: CONSENT_VERSION },
        user.cookie,
      );
    expect(
      (await call("POST", "/api/subscriptions", aliceSub)).statusCode,
    ).toBe(200);
    expect(
      (await call("POST", "/api/subscriptions", bobSub, bob.cookie)).statusCode,
    ).toBe(200);
    expect(
      (await call("POST", "/api/subscriptions", aliceSub, bob.cookie))
        .statusCode,
    ).toBe(400);
    await call(
      "DELETE",
      "/api/subscriptions",
      { endpoint: aliceSub.endpoint },
      bob.cookie,
    );
    expect(
      (
        await call("POST", "/api/device-status", {
          endpoint: aliceSub.endpoint,
        })
      ).json().active,
    ).toBe(true);
    const config = {
      enabled: true,
      weekday: 1,
      frequency: "week",
      time: "08:00",
      timezone: "Europe/Paris",
      channel: "push",
    };
    for (const user of [alice, bob])
      expect(
        (await call("PUT", "/api/reminder", config, user.cookie)).statusCode,
      ).toBe(200);
    const now = DateTime.now().startOf("minute");
    const occurrence = now.toUTC().toISO();
    db.prepare("UPDATE reminders SET next_at = ?, anchor = ?").run(
      occurrence,
      now.toISODate(),
    );
    const spy = vi
      .spyOn(webpush, "sendNotification")
      .mockResolvedValue({ statusCode: 201, headers: {}, body: "" });
    const { runJobs } = await import("../server/jobs");
    await runJobs(now);
    await runJobs(now);
    expect(spy).toHaveBeenCalledTimes(2);
    const endpoints = spy.mock.calls.map((c) => c[0].endpoint);
    expect(endpoints).toEqual(
      expect.arrayContaining([aliceSub.endpoint, bobSub.endpoint]),
    );
    expect(spy.mock.calls[0][1]).not.toMatch(/weight|poids|IMC|78|note/);
    db.prepare("UPDATE reminders SET next_at = ?").run(occurrence);
    await runJobs(now);
    expect(spy).toHaveBeenCalledTimes(2);
    for (const user of [alice, bob])
      await call(
        "POST",
        "/api/consents",
        { purpose: "push", granted: false, version: CONSENT_VERSION },
        user.cookie,
      );
    db.prepare("UPDATE reminders SET enabled = 1, next_at = ?").run(occurrence);
    await runJobs(now);
    expect(spy).toHaveBeenCalledTimes(2);
    await call("POST", "/api/consents", {
      purpose: "push",
      granted: true,
      version: CONSENT_VERSION,
    });
    await call("POST", "/api/subscriptions", aliceSub);
    await call("PUT", "/api/reminder", config);
    db.prepare("UPDATE reminders SET next_at = ? WHERE user_id = ?").run(
      occurrence,
      alice.id,
    );
    spy.mockRejectedValue({ statusCode: 410 });
    await runJobs(now);
    expect(
      (
        await call("POST", "/api/device-status", {
          endpoint: aliceSub.endpoint,
        })
      ).json().active,
    ).toBe(false);
    spy.mockRestore();
  });
  it("nettoie encore les anciennes photos lors d’un retrait", async () => {
    const id = crypto.randomUUID();
    const filename = `${id}.webp`;
    db.prepare("INSERT INTO photos VALUES (?, ?, ?, ?, ?, ?)").run(
      id,
      alice.id,
      entryId,
      "face",
      filename,
      new Date().toISOString(),
    );
    writeFileSync(resolve(dir, "photos", filename), "legacy-image");
    const archive = await call("POST", "/api/export", {
      format: "zip",
      includePhotos: true,
    });
    expect(Object.keys(unzipSync(archive.rawPayload)).sort()).toEqual([
      "donnees.json",
      "mesures.csv",
    ]);
    await call("POST", "/api/consents", {
      purpose: "photos",
      granted: false,
      version: CONSENT_VERSION,
    });
    expect(readdirSync(resolve(dir, "photos"))).toHaveLength(0);
    expect(
      (await call("GET", "/api/account"))
        .json()
        .entries.some((e: any) => e.photos.length),
    ).toBe(false);
  });
  it("supprime une entrée et recalcule les sources", async () => {
    expect((await call("DELETE", `/api/entries/${entryId}`)).statusCode).toBe(
      200,
    );
    expect(
      (await call("GET", "/api/account"))
        .json()
        .entries.some((e: any) => e.id === entryId),
    ).toBe(false);
  });
  it("efface les données corporelles et arrête les canaux au retrait principal", async () => {
    await call("POST", "/api/consents", {
      purpose: "push",
      granted: true,
      version: CONSENT_VERSION,
    });
    const data = (
      await call("POST", "/api/consents", {
        purpose: "body",
        granted: false,
        version: CONSENT_VERSION,
      })
    ).json();
    expect(data.entries).toHaveLength(0);
    expect(data.goal).toBeNull();
    expect(data.profile.height).toBeNull();
    expect(data.consents.push).toBe(false);
    expect(data.reminder.enabled).toBe(false);
  });
  it("vérifie l’identité puis supprime le compte et révoque les sessions", async () => {
    expect(
      (await call("DELETE", "/api/account", { password: "mauvais" }))
        .statusCode,
    ).toBe(403);
    expect(
      (await call("DELETE", "/api/account", { password: initialPassword }))
        .statusCode,
    ).toBe(200);
    expect((await call("GET", "/api/account")).statusCode).toBe(401);
    for (const table of [
      "profiles",
      "entries",
      "photos",
      "goals",
      "consents",
      "reminders",
      "subscriptions",
      "session",
      "account",
    ]) {
      const key = ["session", "account"].includes(table) ? "userId" : "user_id";
      expect(
        db
          .prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${key}=?`)
          .get(alice.id).n,
      ).toBe(0);
    }
    expect(
      (await call("GET", "/api/account", undefined, bob.cookie)).statusCode,
    ).toBe(200);
  });
  it("empêche une restauration de réactiver un compte supprimé", async () => {
    db.prepare(
      "INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt) VALUES (?, ?, ?, 1, ?, ?)",
    ).run(
      alice.id,
      "Restaurée",
      "restauree@example.test",
      new Date().toISOString(),
      new Date().toISOString(),
    );
    db.prepare("INSERT INTO profiles (user_id) VALUES (?)").run(alice.id);
    const { enforceDeletionLedger } = await import("../server/retention");
    enforceDeletionLedger();
    expect(
      db.prepare("SELECT id FROM user WHERE id = ?").get(alice.id),
    ).toBeUndefined();
    expect(
      db
        .prepare("SELECT user_id FROM profiles WHERE user_id = ?")
        .get(alice.id),
    ).toBeUndefined();
  });
  it("récupère l’accès avec un lien et révoque les anciennes sessions", async () => {
    const requested = await call(
      "POST",
      "/api/auth/request-password-reset",
      {
        email: "bob@example.test",
        redirectTo: "http://localhost:5173/?reset=1#account",
      },
      "",
    );
    expect(requested.statusCode).toBe(200);
    const mail = db
      .prepare(
        "SELECT url FROM dev_mail WHERE email = ? AND purpose = 'reset' ORDER BY rowid DESC LIMIT 1",
      )
      .get("bob@example.test");
    const url = new URL(mail.url);
    const redirect = await call(
      "GET",
      url.pathname + url.search,
      undefined,
      "",
    );
    expect(redirect.statusCode).toBe(302);
    const token = new URL(redirect.headers.location as string).searchParams.get(
      "token",
    );
    expect(token).toBeTruthy();
    const reset = await call(
      "POST",
      "/api/auth/reset-password",
      { token, newPassword: "NouvellePassphrase!2026" },
      "",
    );
    expect(reset.statusCode).toBe(200);
    expect(
      (await call("GET", "/api/account", undefined, bob.cookie)).statusCode,
    ).toBe(401);
    const signin = await call(
      "POST",
      "/api/auth/sign-in/email",
      { email: "bob@example.test", password: "NouvellePassphrase!2026" },
      "",
    );
    expect(signin.statusCode).toBe(200);
    bob.cookie = signin.cookies
      .filter((c) => c.value)
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    expect(
      (await call("GET", "/api/account", undefined, bob.cookie)).statusCode,
    ).toBe(200);
  });
  it("purge les timestamps ISO réellement utilisés par l’authentification", async () => {
    const id = crypto.randomUUID();
    const old = "2020-01-01T00:00:00.000Z";
    db.prepare(
      "INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt) VALUES (?, ?, ?, 0, ?, ?)",
    ).run(id, "Compte non vérifié", "non-verifie@example.test", old, old);
    const verificationId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO verification (id,identifier,value,expiresAt,createdAt,updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(verificationId, "expirée", "jeton-fictif", old, old, old);
    const expiredId = crypto.randomUUID();
    db.prepare(
      "INSERT INTO session (id,token,userId,expiresAt,createdAt,updatedAt) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(expiredId, "session-fictive-expirée", bob.id, old, old, old);
    const { runJobs } = await import("../server/jobs");
    await runJobs();
    expect(
      db.prepare("SELECT id FROM user WHERE id = ?").get(id),
    ).toBeUndefined();
    expect(
      db
        .prepare("SELECT id FROM verification WHERE id = ?")
        .get(verificationId),
    ).toBeUndefined();
    expect(
      db.prepare("SELECT id FROM session WHERE id = ?").get(expiredId),
    ).toBeUndefined();
  });
  it("purge les comptes inactifs et les jetons expirés", async () => {
    const { purgeExpiredData } = await import("../server/retention");
    db.prepare("UPDATE profiles SET last_active = ? WHERE user_id = ?").run(
      "2020-01-01T00:00:00.000Z",
      bob.id,
    );
    purgeExpiredData();
    expect(
      db.prepare("SELECT id FROM user WHERE id = ?").get(bob.id),
    ).toBeUndefined();
    expect(
      (await call("GET", "/api/account", undefined, bob.cookie)).statusCode,
    ).toBe(401);
  });
});
