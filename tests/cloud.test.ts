import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import sharp from "sharp";
import { Image } from "imagescript";
import {
  cloudCommit,
  emptyCloudAccount,
  mutateCloudAccount,
  publicCloudAccount,
} from "../shared/cloud-domain";
import { cloudImageDimensions } from "../shared/cloud-images";
import { CONSENT_VERSION } from "../shared/config";
const caps = {
  pushConfigured: true,
  emailConfigured: false,
  development: false,
  privacyContact: null,
};
const now = DateTime.fromISO("2026-10-05T08:00:00Z");
const change = (
  a: ReturnType<typeof emptyCloudAccount>,
  method: string,
  path: string,
  body: any,
  uploads: any[] = [],
) => mutateCloudAccount(a, method, path, body, caps, uploads, now);
const body = () => ({
  date: "2026-10-05",
  values: { weight: 80.4 },
  height: 180,
  note: "Repère du jour",
  requestId: crypto.randomUUID(),
});
const consent = (
  a: ReturnType<typeof emptyCloudAccount>,
  purpose = "body",
  granted = true,
) =>
  change(a, "POST", "/consents", { purpose, granted, version: CONSENT_VERSION })
    .account;
describe("Sauvegarde distante", () => {
  it("enregistre le démarrage en un seul changement sans activer les options", () => {
    const before = emptyCloudAccount("Alice", "Europe/Paris");
    const payload = {
      height: 175.5,
      consent: true,
      version: CONSENT_VERSION,
      goal: { measureId: "weight", start: 80, target: 75 },
    };
    expect(() =>
      change(before, "POST", "/onboarding", { ...payload, consent: false }),
    ).toThrow();
    expect(() =>
      change(before, "POST", "/onboarding", {
        ...payload,
        goal: { ...payload.goal, measureId: "unknown" },
      }),
    ).toThrow();
    expect(before.consents.body).toBe(false);
    const after = change(before, "POST", "/onboarding", payload).account;
    expect(after.profile).toMatchObject({
      height: 175.5,
      onboardingCompleted: true,
    });
    expect(after.consents).toEqual({
      body: true,
      photos: false,
      push: false,
      email: false,
    });
    expect(after.goal).toEqual({ ...payload.goal, startDate: "2026-10-05" });
    expect(after.entries).toEqual([]);
    expect(after.audit).toHaveLength(1);
    const updated = change(after, "PATCH", "/profile", {
      ...after.profile,
      name: "Alice modifiée",
    }).account;
    expect(updated.profile.onboardingCompleted).toBe(true);
    const noTarget = change(before, "POST", "/onboarding", {
      ...payload,
      goal: null,
    }).account;
    expect(noTarget.goal).toBeNull();
    expect(noTarget.profile.onboardingCompleted).toBe(true);
  });
  it("commence vide sans reprendre les exemples", () => {
    const a = emptyCloudAccount("Alice");
    expect(a.entries).toEqual([]);
    expect(Object.values(a.consents)).toEqual([false, false, false, false]);
    expect(publicCloudAccount(a)).not.toHaveProperty("subscriptions");
  });
  it("bloque la collecte avant consentement", () => {
    const a = emptyCloudAccount("Alice");
    expect(() => change(a, "POST", "/entries", body())).toThrow("désactivé");
    expect(() => consent(a, "photos")).toThrow("désactivé");
  });
  it("garde les nombres, notes et la stature historique", () => {
    const a = consent(emptyCloudAccount("Alice"));
    const e = change(a, "POST", "/entries", body());
    expect(e.account.entries[0]).toMatchObject({
      values: { weight: 80.4 },
      height: 180,
      note: "Repère du jour",
    });
    expect(a.entries).toEqual([]);
  });
  it("une même requête ne crée pas deux entrées", () => {
    const a = consent(emptyCloudAccount("Alice")),
      b = body();
    const first = change(a, "POST", "/entries", b);
    expect(
      change(first.account, "POST", "/entries", b).account.entries,
    ).toHaveLength(1);
  });
  it("rejette les dates futures, valeurs inconnues et erreurs de format", () => {
    const a = consent(emptyCloudAccount("Alice"));
    expect(() =>
      change(a, "POST", "/entries", { ...body(), date: "2027-01-01" }),
    ).toThrow("futur");
    expect(() =>
      change(a, "POST", "/entries", { ...body(), values: { other: 1 } }),
    ).toThrow("inconnue");
    expect(() =>
      change(a, "POST", "/entries", { ...body(), values: { weight: -1 } }),
    ).toThrow();
  });
  it("un fichier exige un accord photo et une orientation unique", () => {
    const a = consent(emptyCloudAccount("Alice"));
    const photo = { id: crypto.randomUUID(), entryId: "", orientation: "face" };
    expect(() => change(a, "POST", "/entries", body(), [photo])).toThrow(
      "photos",
    );
    expect(() =>
      change(consent(a, "photos"), "POST", "/entries", body(), [photo, photo]),
    ).toThrow("orientation");
  });
  it("le retrait photo efface les photos et les entrées photo seules", () => {
    let a = consent(consent(emptyCloudAccount("Alice")), "photos");
    a = change(a, "POST", "/entries", { ...body(), values: {}, note: "" }, [
      { id: crypto.randomUUID(), entryId: "", orientation: "face" },
    ]).account;
    expect(a.entries).toHaveLength(1);
    expect(consent(a, "photos", false).entries).toEqual([]);
  });
  it("le retrait principal efface suivi et canaux tout en traçant les accords", () => {
    let a = consent(consent(emptyCloudAccount("Alice")), "photos");
    a = change(a, "POST", "/entries", body()).account;
    a = consent(a, "body", false);
    expect(a.entries).toEqual([]);
    expect(a.profile.height).toBeNull();
    expect(a.goal).toBeNull();
    expect(a.subscriptions).toEqual([]);
    expect(a.audit[0]).toMatchObject({ purpose: "photos", granted: false });
  });
  it("un consentement retiré pendant une sauvegarde bloque sa nouvelle tentative", async () => {
    let current = consent(emptyCloudAccount("Alice")),
      revision = 0;
    const b = body();
    await expect(
      cloudCommit(
        async () => ({ data: current, revision }),
        async () => {
          current = consent(current, "body", false);
          revision++;
          return false;
        },
        (a) => change(a, "POST", "/entries", b),
      ),
    ).rejects.toThrow("désactivé");
    expect(current.entries).toEqual([]);
  });
  it("réessaie une modification concurrente sans perdre l’autre entrée", async () => {
    let current = consent(emptyCloudAccount("Alice")),
      revision = 0,
      attempts = 0;
    const b = body();
    const saved = await cloudCommit(
      async () => ({ data: current, revision }),
      async (rev, data) => {
        if (!attempts++) {
          current = change(current, "POST", "/entries", body()).account;
          revision++;
          return false;
        }
        if (rev !== revision) return false;
        current = data;
        revision++;
        return true;
      },
      (a) => change(a, "POST", "/entries", b),
    );
    expect(saved.account.entries).toHaveLength(2);
  });
  it("garde la cadence de quinze jours lors d’un simple arrêt", () => {
    let a = consent(emptyCloudAccount("Alice"));
    a = consent(a, "push");
    a.subscriptions = [
      {
        endpoint: "https://fcm.googleapis.com/test",
        keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) },
      },
    ];
    a = change(a, "PUT", "/reminder", {
      enabled: true,
      weekday: 1,
      frequency: "fortnight",
      time: "09:30",
      timezone: "Europe/Paris",
      channel: "push",
    }).account;
    const anchor = a.reminder!.anchor;
    a = change(a, "PUT", "/reminder", {
      ...a.reminder,
      enabled: false,
    }).account;
    expect(a.reminder!.anchor).toBe(anchor);
    expect(a.reminder!.nextAt).toBeNull();
  });
  it("ne transmet pas un abonnement à un domaine tiers", () => {
    const a = consent(consent(emptyCloudAccount("Alice")), "push");
    expect(() =>
      change(a, "POST", "/subscriptions", {
        endpoint: "https://example.com/private",
        keys: { p256dh: "a".repeat(87), auth: "b".repeat(22) },
      }),
    ).toThrow("fournisseur");
  });
  it("décode réellement JPEG / PNG et retire leurs métadonnées", async () => {
    for (const format of ["jpeg", "png"] as const) {
      const bytes = await sharp({
        create: { width: 15, height: 25, channels: 3, background: "red" },
      })
        [format]()
        .withMetadata()
        .toBuffer();
      expect(cloudImageDimensions(bytes)).toEqual({ width: 15, height: 25 });
      const decoded = await Image.decode(bytes);
      const normalized = await (decoded as Image).encodeJPEG(88);
      expect((await sharp(normalized).metadata()).exif).toBeUndefined();
      expect((await sharp(normalized).metadata()).width).toBe(15);
    }
  });
  it("refuse un faux JPEG et les dimensions excessives avant le décodeur", () => {
    expect(() =>
      cloudImageDimensions(
        new TextEncoder().encode(
          "Ceci n’est pas une photo mais un fichier de texte.",
        ),
      ),
    ).toThrow();
    const bytes = new Uint8Array(24);
    bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
    bytes.set([73, 72, 68, 82], 12);
    new DataView(bytes.buffer).setUint32(16, 100000);
    new DataView(bytes.buffer).setUint32(20, 100000);
    expect(() => cloudImageDimensions(bytes)).toThrow("pixels");
  });
});
