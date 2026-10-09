import { CONSENT_VERSION } from "../shared/config";
import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { DateTime } from "luxon";
import {
  ABDOMINAL_LABELS,
  TOOL_VERSION,
  LEGACY_TOOL_VERSION,
  newMeasurementToolContext,
  ageAt,
  classifyAbdominal,
  entryTools,
  lengthCm,
  mifflin,
  newToolContext,
  orderedSessions,
  thresholdNumber,
  validDate,
  waistHeight,
  weightKg,
} from "../shared/body-tools";
import {
  bmi,
  indicators,
  parseDecimal,
  inputDecimal,
  ratio,
} from "../shared/calculations";
import { toolContextSchema, toolDateIssue } from "../shared/tool-schemas";
import { accountCsv } from "../shared/export";
import {
  emptyCloudAccount,
  mutateCloudAccount,
  publicCloudAccount,
  upgradeCloudAccount,
} from "../shared/cloud-domain";
import type { Entry } from "../shared/types";
const session = (patch: Partial<Entry> = {}): Entry => ({
  id: "test",
  date: "2026-10-06",
  createdAt: "2026-10-06T09:00:00Z",
  height: 180,
  values: { weight: 80, waist: 90, hips: 100 },
  note: "",
  photos: [],
  tools: {
    ...newToolContext({ birthDate: "1996-10-06", equation: "male" }),
    heightDate: "2026-09-01",
    heightOrigin: "profile",
    waistProtocol: "nice-midpoint",
  },
  ...patch,
});
describe("Formules et conversions conformes aux références, sans validation clinique", () => {
  it("conserve la précision lors de l’édition, y compris les petites valeurs historiques", () => {
    for (const value of [
      90.12345678901234,
      1e-7,
      1e-30,
      Number.MIN_VALUE,
      100000,
    ]) {
      expect(parseDecimal(inputDecimal(value))).toBe(value);
    }
  });

  it.each([
    [90, 0.5],
    [108, 0.6],
    [72, 0.4],
  ])("RTH %s / 180 = %s", (waist, expected) =>
    expect(waistHeight(waist, 180)).toBe(expected),
  );
  it.each([
    ["male", 1780],
    ["female", 1614],
  ] as const)("Mifflin %s", (equation, expected) => {
    expect(mifflin(80, 180, 30, equation)).toBe(expected);
    expect(mifflin(80000, 1.8, 30, equation, "g", "m")).toBe(expected);
  });
  it("refuse les unités incohérentes sans les deviner", () => {
    expect(lengthCm(180, "kg")).toBeNull();
    expect(weightKg(80, "cm")).toBeNull();
    expect(mifflin(80, 180, 30, "male", "lb")).toBeNull();
  });
  it.each([undefined, null, NaN, Infinity, -Infinity, 0, -1, "90"])(
    "refuse une valeur invalide %s",
    (v) => {
      expect(waistHeight(v, 180)).toBeNull();
      expect(mifflin(v, 180, 30, "male")).toBeNull();
    },
  );
  it("décimales françaises et précision complète", () => {
    expect(parseDecimal(" 90,12345 ")).toBe(90.12345);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("1,2,3")).toBeNaN();
    expect(bmi(80.12345, 180.12345)).toBe(80.12345 / (180.12345 / 100) ** 2);
  });
  it("ne borne pas artificiellement les résultats impossibles", () => {
    expect(mifflin(80, 180, 30, "unspecified")).toBeNull();
    expect(mifflin(1, 1, 78, "female")).toBeNull();
    expect(bmi(Infinity, 180)).toBeNull();
    expect(ratio(90, 0)).toBeNull();
    expect(waistHeight(1e308, 1e-308)).toBeNull();
  });
});
describe("Classification avant arrondi", () => {
  it.each([
    [0.399999, "below"],
    [0.4, "reference"],
    [0.400001, "reference"],
    [0.499999, "reference"],
    [0.5, "increased"],
    [0.500001, "increased"],
    [0.599999, "increased"],
    [0.6, "high"],
    [0.600001, "high"],
  ] as const)("%s → %s", (r, c) => expect(classifyAbdominal(r, 24)).toBe(c));
  it.each([34.999, 35, 35.001, null])("IMC %s", (b) =>
    expect(classifyAbdominal(0.5, b)).toBe(
      b !== null && b < 35 ? "increased" : null,
    ),
  );
  it("affichage cohérent près des seuils et aucune catégorie médicale inventée sous 0,40", () => {
    expect(thresholdNumber(0.499999, [0.4, 0.5, 0.6])).toBe("0,499999");
    expect(thresholdNumber(34.9999, [35], 1)).toBe("34,9999");
    expect(thresholdNumber(0.5, [0.4, 0.5, 0.6])).toBe("0,50");
    expect(ABDOMINAL_LABELS.below).toContain("Sous la plage");
  });
});
describe("Âge historique et éligibilité", () => {
  it("anniversaire et dates calendaires valides", () => {
    expect(ageAt("1996-10-06", "2026-10-05")).toBe(29);
    expect(ageAt("1996-10-06", "2026-10-06")).toBe(30);
    expect(ageAt("2000-02-29", "2025-02-28")).toBe(24);
    expect(ageAt("2000-02-29", "2025-03-01")).toBe(25);
    expect(ageAt("2026-01-01", "2025-12-31")).toBeNull();
    expect(validDate("2025-02-29")).toBe(false);
    expect(validDate("2026-13-01")).toBe(false);
  });
  it.each([18, 19, 20, 69, 70, 78, 79])("borne %s ans", (age) => {
    const e = session();
    e.tools!.birthDate = `${2026 - age}-10-06`;
    const r = entryTools(e);
    expect(r.energy.value !== null).toBe(age >= 19 && age <= 78);
  });
  it("aucun repère adulte pour un enfant ou âge absent", () => {
    for (const birthDate of ["2015-01-01", null]) {
      const e = session();
      e.tools!.birthDate = birthDate;
      expect(entryTools(e).abdominal.category).toBeNull();
      expect(entryTools(e).bmiReason).toBeTruthy();
    }
  });
  it("lit les anciens contextes sans demander de déclaration supplémentaire", () => {
    const e = session();
    e.tools!.version = LEGACY_TOOL_VERSION;
    const legacy = { ...e.tools, situation: "pregnancy" };
    e.tools = toolContextSchema.parse(legacy);
    expect(e.tools).not.toHaveProperty("situation");
    expect(entryTools(e).energy.value).toBe(1780);
    expect(entryTools(e).abdominal.category).toBe("increased");
  });
  it("calcule une nouvelle séance depuis le profil et les champs du catalogue", () => {
    const e = session({
      tools: newMeasurementToolContext({
        birthDate: "1996-10-06",
        equation: "male",
      }),
    });
    expect(e.tools!.heightDate).toBeNull();
    expect(entryTools(e).energy.value).toBe(1780);
    expect(entryTools(e).abdominal.category).toBe("increased");
    expect(e.tools!.version).toBe(TOOL_VERSION);
  });
  it("équation non renseignée : aucun résultat fictif", () => {
    const e = session();
    e.tools!.equation = "unspecified";
    expect(entryTools(e).energy.value).toBeNull();
    expect(entryTools(e).energy.reason).toContain("explicitement");
  });
});
describe("Protocoles, dates et absence de mélange des séances", () => {
  it("explique l’IMC absent ou ≥ 35 même si le contexte ancien est inconnu", () => {
    const missing = session({ tools: undefined, values: { waist: 90 } });
    expect(entryTools(missing).abdominal.reason).toContain("IMC absent");
    const high = session({
      tools: undefined,
      values: { waist: 90, weight: 120 },
    });
    expect(entryTools(high).abdominal.reason).toContain("IMC ≥ 35");
  });

  it.each(["unknown", "iliac-crest"] as const)(
    "pas de classification NICE avec %s",
    (protocol) => {
      const e = session();
      e.tools!.waistProtocol = protocol;
      expect(entryTools(e).abdominal.category).toBeNull();
      expect(entryTools(e).abdominal.value).toBe(0.5);
      expect(entryTools(e).abdominal.reason).toBeNull();
    },
  );
  it("le rapport tour de taille / hauteur utilise le tour normal sans modifier son contexte", () => {
    const e = session({ values: { weight: 80, waist: 90 } });
    e.tools!.waistProtocol = "unknown";
    const original = structuredClone(e);
    const result = entryTools(e);
    expect(result.abdominal.value).toBe(0.5);
    expect(result.abdominal.reason).toBeNull();
    expect(result.abdominal.category).toBeNull();
    expect(e).toEqual(original);
  });
  it("ignore les métadonnées de l’outil retiré dans les anciens contextes", () => {
    const e = session();
    const tools = toolContextSchema.parse({
      ...e.tools,
      rfmWaistProtocol: "iliac-crest",
    });
    expect(tools).toEqual(e.tools);
    expect(tools).not.toHaveProperty("rfmWaistProtocol");
    expect(entryTools(e)).not.toHaveProperty("rfm");
  });
  it("ne recherche ni poids ni tour de taille dans une autre séance", () => {
    const e = session({ values: { waist: 90 } });
    expect(entryTools(e).abdominal.value).toBe(0.5);
    expect(entryTools(e).abdominal.category).toBeNull();
    expect(entryTools(e).energy.value).toBeNull();
    expect(entryTools(e).abdominal.reason).toContain("IMC absent");
  });
  it("sélection chronologique, même jour et exclusion des données futures", () => {
    const early = session({ id: "early", createdAt: "2026-10-06T08:00:00Z" }),
      late = session({ id: "late" });
    const future = session({ id: "future", date: "2026-10-07" }),
      past = session({ id: "past", date: "2026-09-06" });
    expect(
      orderedSessions(
        [future, late, past, early],
        "2026-10-06",
        "2026-10-01",
      ).map((e) => e.id),
    ).toEqual(["early", "late"]);
    const e = session();
    e.tools!.heightDate = "2026-10-07";
    expect(entryTools(e).energy.value).toBeNull();
    expect(entryTools(e).bmi).toBeNull();
    expect(toolDateIssue(e.tools, e.date)).toContain("après");
  });
  it("hauteur antérieure explicite, pas de substitution par le profil actuel", () => {
    const e = session();
    expect(entryTools(e).energy.value).toBe(1780);
    e.tools!.heightDate = null;
    expect(entryTools(e).energy.value).toBe(1780);
    expect(entryTools(e).bmi).toBeCloseTo(24.691358);
  });
  it("préserve les anciens ratios sans attribuer de protocole", () => {
    const e = session({ tools: undefined });
    const original = structuredClone(e);
    const r = entryTools(e);
    expect(r.bmi).toBe(indicators(e).bmi);
    expect(r.waistHips).toBe(0.9);
    expect(r.abdominal.value).toBe(0.5);
    expect(r.abdominal.category).toBeNull();
    expect(e).toEqual(original);
  });
});
describe("Migration, sauvegarde cloud et exports", () => {
  const caps = {
    pushConfigured: false,
    emailConfigured: false,
    development: false,
    privacyContact: null,
  };
  const now = DateTime.fromISO("2026-10-06T10:00:00Z");
  it("migration SQLite additive conserve intégralement une ligne ancienne", () => {
    const db = new Database(":memory:");
    try {
      db.exec(
        "CREATE TABLE entries(id TEXT, height REAL, values_json TEXT); CREATE TABLE profiles(user_id TEXT,height REAL); INSERT INTO entries VALUES ('old',180,'{\"waist\":90.12345}'); INSERT INTO profiles VALUES ('u',180);",
      );
      db.exec(readFileSync("server/migrations/006_body_tools.sql", "utf8"));
      expect(db.prepare("SELECT * FROM entries").get()).toEqual({
        id: "old",
        height: 180,
        values_json: '{"waist":90.12345}',
        tools_json: null,
      });
      expect(db.prepare("SELECT * FROM profiles").get()).toEqual({
        user_id: "u",
        height: 180,
        tool_profile_json: null,
        height_date: null,
      });
    } finally {
      db.close();
    }
  });
  it("retire l’ancien outil des parcours sans effacer les valeurs sauvegardées", () => {
    const a = emptyCloudAccount("Test");
    a.consents.body = true;
    a.entries = [
      session({ tools: undefined, values: { waist: 90, "waist-rfm": 92 } }),
      session({
        id: "retired-only",
        tools: undefined,
        values: { "waist-rfm": 92 },
      }),
    ];
    a.measures.push({
      id: "waist-rfm",
      name: "Tour de taille — RFM",
      unit: "cm",
    });
    a.profile.visible.push("waist-rfm");
    a.goal = {
      measureId: "waist-rfm",
      start: 92,
      target: 90,
      startDate: "2026-10-06",
    };
    const original = structuredClone(a),
      upgraded = upgradeCloudAccount(a);
    expect(upgraded.entries).toEqual(a.entries);
    expect(upgraded.entries[0].tools).toBeUndefined();
    expect(upgraded.measures.find((m) => m.id === "waist-rfm")?.archived).toBe(
      true,
    );
    expect(upgradeCloudAccount(upgraded)).toEqual(upgraded);
    expect(a).toEqual(original);
    const visible = publicCloudAccount(a);
    expect(visible.measures.some((m) => m.id === "waist-rfm")).toBe(false);
    expect(visible.profile.visible).not.toContain("waist-rfm");
    expect(visible.entries[0].values).toEqual({ waist: 90 });
    expect(visible.entries).toHaveLength(1);
    expect(visible.goal).toBeNull();
    expect(accountCsv(a)).not.toMatch(/rfm/i);
    const edited = mutateCloudAccount(
      a,
      "PUT",
      "/entries/test",
      {
        ...a.entries[0],
        values: { waist: 89 },
        requestId: crypto.randomUUID(),
      },
      caps,
      now,
    ).account;
    expect(edited.entries[0].values).toEqual({ waist: 89, "waist-rfm": 92 });
    expect(() =>
      mutateCloudAccount(
        a,
        "POST",
        "/entries",
        {
          ...a.entries[0],
          requestId: crypto.randomUUID(),
        },
        caps,
        now,
      ),
    ).toThrow("Mesure inconnue");
  });
  it("aller-retour cloud, mise à jour ancienne, validation et retrait", () => {
    let a = emptyCloudAccount("Test");
    a.consents.body = true;
    const e = session();
    const body = { ...e, requestId: crypto.randomUUID() };
    a = mutateCloudAccount(a, "POST", "/entries", body, caps, now).account;
    const id = a.entries[0].id;
    expect(a.entries[0].tools).toEqual(e.tools);
    const updated = mutateCloudAccount(
      a,
      "PUT",
      `/entries/${id}`,
      { ...body, tools: undefined, note: "modifiée" },
      caps,
      now,
    ).account;
    expect(updated.entries[0].tools).toEqual(e.tools);
    expect(() =>
      mutateCloudAccount(
        a,
        "PUT",
        `/entries/${id}`,
        { ...body, tools: { ...e.tools, heightDate: "2026-10-07" } },
        caps,
        now,
      ),
    ).toThrow("après");
    a.profile.toolProfile = { birthDate: "1996-10-06", equation: "male" };
    a = mutateCloudAccount(
      a,
      "POST",
      "/consents",
      { purpose: "body", granted: false, version: CONSENT_VERSION },
      caps,
      now,
    ).account;
    expect(a.entries).toEqual([]);
    expect(a.profile.toolProfile).toBeUndefined();
    expect(a.profile.heightDate).toBeNull();
  });
  it("CSV conserve dates, valeurs exactes, protocoles inconnus et versions ; JSON fidèle", () => {
    const a = emptyCloudAccount("Test");
    a.entries = [
      session(),
      session({
        id: "old",
        tools: undefined,
        values: { waist: 90.12345 },
        note: "=2+3",
      }),
    ];
    const csv = accountCsv(a);
    expect(csv).toContain('"90.12345"');
    expect(csv).toContain('"nice-midpoint"');
    expect(csv).toContain('"unknown"');
    expect(csv).toContain('"2026-09-01"');
    expect(csv).toContain(TOOL_VERSION);
    expect(csv).toContain('"\'=2+3"');
    expect(JSON.parse(JSON.stringify(publicCloudAccount(a))).entries).toEqual(
      a.entries,
    );
  });
});
