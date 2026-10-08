import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import {
  cloudCommit,
  emptyCloudAccount,
  mutateCloudAccount,
  publicCloudAccount,
} from "../shared/cloud-domain";
import { CONSENT_VERSION } from "../shared/config";
import { onboardingTools } from "./onboarding-fixture";
import { newToolContext } from "../shared/body-tools";
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
) => mutateCloudAccount(a, method, path, body, caps, now);
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
  it("demande seulement naissance et équation au démarrage, en conservant les réglages facultatifs existants", () => {
    const before = emptyCloudAccount("Alice", "Europe/Paris");
    const payload = {
      ...onboardingTools,
      height: 180,
      consent: true,
      version: CONSENT_VERSION,
      goal: null,
    };
    for (const toolProfile of [
      undefined,
      { ...onboardingTools.toolProfile, birthDate: null },
      { ...onboardingTools.toolProfile, equation: undefined },
      { ...onboardingTools.toolProfile, waistProtocol: "invalid" },
      { ...onboardingTools.toolProfile, rfmWaistProtocol: "nice-midpoint" },
      {
        ...onboardingTools.toolProfile,
        birthDate: "2026-10-06",
        equation: "female",
      },
      {
        ...onboardingTools.toolProfile,
        birthDate: "2000-02-30",
        equation: "female",
      },
      { ...onboardingTools.toolProfile, birthDate: "", equation: "female" },
      {
        ...onboardingTools.toolProfile,
        birthDate: "1996-10-05",
        equation: "inferred",
      },
    ]) {
      expect(() =>
        change(before, "POST", "/onboarding", { ...payload, toolProfile }),
      ).toThrow();
      expect(before.consents.body).toBe(false);
      expect(before.profile.toolProfile).toBeUndefined();
      expect(before.profile.onboardingCompleted).toBe(false);
      expect(before.audit).toEqual([]);
    }
    for (const heightDate of ["2000-02-30", "2026-10-06"]) {
      expect(() =>
        change(before, "POST", "/onboarding", { ...payload, heightDate }),
      ).toThrow();
    }
    const toolProfile = {
      ...onboardingTools.toolProfile,
      birthDate: "1996-10-05",
      equation: "female",
      waistProtocol: "nice-midpoint",
      rfmWaistProtocol: "iliac-crest",
    };
    const saved = change(before, "POST", "/onboarding", {
      ...payload,
      toolProfile,
      heightDate: "2000-01-01",
    }).account;
    expect(publicCloudAccount(saved).profile.toolProfile).toEqual(toolProfile);
    expect(saved.profile.heightDate).toBe("2000-01-01");
    expect(newToolContext(saved.profile.toolProfile)).toMatchObject(
      toolProfile,
    );
    const simplified = change(saved, "POST", "/onboarding", payload).account;
    expect(simplified.profile.toolProfile).toEqual({
      ...toolProfile,
      ...payload.toolProfile,
    });
    expect(simplified.profile.heightDate).toBe("2000-01-01");
    expect(before.profile.toolProfile).toBeUndefined();
  });
  it("enregistre le démarrage en un seul changement sans activer les options", () => {
    const before = emptyCloudAccount("Alice", "Europe/Paris");
    const payload = {
      ...onboardingTools,
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
    expect(after.profile.toolProfile).toEqual(payload.toolProfile);
    expect(after.profile.heightDate ?? null).toBeNull();
    expect(after.audit).toHaveLength(1);
    const updated = change(after, "PATCH", "/profile", {
      ...after.profile,
      name: "Alice modifiée",
    }).account;
    expect(updated.profile.onboardingCompleted).toBe(true);
    const avatar = "data:image/jpeg;base64,/9j/2Q==";
    const pictured = change(updated, "PATCH", "/profile", {
      ...updated.profile,
      avatar,
    }).account;
    expect(pictured.profile.avatar).toBe(avatar);
    expect(() =>
      change(pictured, "PATCH", "/profile", {
        ...pictured.profile,
        avatar: "https://example.com/tracker.jpg",
      }),
    ).toThrow();
    expect(
      change(pictured, "PATCH", "/profile", {
        ...pictured.profile,
        avatar: null,
      }).account.profile.avatar,
    ).toBeNull();

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
    expect(a.profile.visible).toEqual(["waist", "hips"]);
    expect(Object.values(a.consents)).toEqual([false, false, false, false]);
    expect(publicCloudAccount(a)).not.toHaveProperty("subscriptions");
  });
  it("bloque la collecte avant consentement", () => {
    const a = emptyCloudAccount("Alice");
    expect(() => change(a, "POST", "/entries", body())).toThrow("désactivé");
    expect(() => consent(a, "push")).toThrow("désactivé");
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
  it("refuse la réactivation des photos", () => {
    const a = consent(emptyCloudAccount("Alice"));
    expect(() => consent(a, "photos")).toThrow("retiré");
    expect(() =>
      change(a, "POST", "/entries", { ...body(), values: {}, note: "" }),
    ).toThrow("mesure ou une note");
  });
  it("le retrait photo efface les photos et les entrées photo seules", () => {
    const a = consent(emptyCloudAccount("Alice"));
    a.consents.photos = true; // Existing account from before the feature was removed.
    a.entries.push({
      id: crypto.randomUUID(),
      createdAt: now.toISO()!,
      ...body(),
      values: {},
      note: "",
      photos: [{ id: crypto.randomUUID(), entryId: "", orientation: "face" }],
    });
    expect(a.entries).toHaveLength(1);
    expect(consent(a, "photos", false).entries).toEqual([]);
  });
  it("le retrait principal efface suivi et canaux tout en traçant les accords", () => {
    let a = consent(emptyCloudAccount("Alice"));
    a.consents.photos = true; // Legacy consent still needs withdrawal cleanup.
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
    a = change(a, "PUT", "/reminder", {
      ...a.reminder,
      enabled: true,
      frequency: "week",
      weekdays: [5, 1, 3, 3],
    }).account;
    expect(a.reminder!.weekdays).toEqual([1, 3, 5]);
    expect(a.reminder!.nextAt).not.toBeNull();
    expect(() =>
      change(a, "PUT", "/reminder", { ...a.reminder, weekdays: [] }),
    ).toThrow();
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
});
