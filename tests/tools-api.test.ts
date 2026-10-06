import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { FastifyInstance } from "fastify";
import { CONSENT_VERSION } from "../shared/config";
let app: FastifyInstance;
let db: any;
let dir: string;
const headers = (cookie = "") => ({
  origin: "http://localhost:5173",
  "x-requested-with": "Mesura",
  cookie,
});
async function call(method: any, path: string, payload?: any, cookie = "") {
  return app.inject({
    method,
    url: path,
    headers: headers(cookie),
    ...(payload !== undefined ? { payload } : {}),
  });
}
async function account(email: string) {
  const response = await call("POST", "/api/auth/sign-up/email", {
    name: "Outils",
    email,
    password: "TestOutils2026!",
  });
  expect(response.statusCode).toBe(200);
  const cookie = response.cookies
    .filter((c) => c.value)
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  await call("GET", "/api/account", undefined, cookie);
  return { cookie };
}
beforeAll(async () => {
  dir = mkdtempSync(resolve(tmpdir(), "mesura-tools-"));
  process.env.DATA_DIR = dir;
  process.env.NODE_ENV = "test";
  process.env.APP_URL = "http://localhost:5173";
  const module = await import("../server/app");
  db = (await import("../server/db")).db;
  app = await module.buildApp();
});
afterAll(async () => {
  await app?.close();
  db?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe("Outils : persistance locale et compatibilité", () => {
  it("enregistre les données de calcul dès l’inscription, atomiquement et sans les imposer aux anciens clients", async () => {
    const { cookie } = await account("onboarding-tools@example.test");
    const payload = {
      height: 180,
      consent: true,
      version: CONSENT_VERSION,
      goal: null,
    };
    for (const toolProfile of [
      { birthDate: "9999-01-01", equation: "male" },
      { birthDate: "2000-02-30", equation: "male" },
      { birthDate: "", equation: "male" },
      { birthDate: "1996-10-05", equation: "inferred" },
    ]) {
      const rejected = await call(
        "POST",
        "/api/onboarding",
        { ...payload, toolProfile },
        cookie,
      );
      expect(rejected.statusCode).toBe(400);
      const unchanged = (
        await call("GET", "/api/account", undefined, cookie)
      ).json();
      expect(unchanged.consents.body).toBe(false);
      expect(unchanged.profile.toolProfile).toBeUndefined();
      expect(unchanged.profile.onboardingCompleted).toBe(false);
      expect(unchanged.entries).toEqual([]);
    }
    const toolProfile = { birthDate: "1996-10-05", equation: "male" };
    const saved = await call(
      "POST",
      "/api/onboarding",
      { ...payload, toolProfile },
      cookie,
    );
    expect(saved.statusCode).toBe(200);
    const reloaded = (
      await call("GET", "/api/account", undefined, cookie)
    ).json();
    expect(reloaded.profile.toolProfile).toEqual(toolProfile);
    expect(reloaded.profile.onboardingCompleted).toBe(true);
    expect(reloaded.consents.body).toBe(true);
    const legacy = await call("POST", "/api/onboarding", payload, cookie);
    expect(legacy.statusCode).toBe(200);
    expect(legacy.json().profile.toolProfile).toEqual(toolProfile);
    const unspecified = { birthDate: null, equation: "unspecified" };
    const cleared = await call(
      "POST",
      "/api/onboarding",
      { ...payload, toolProfile: unspecified },
      cookie,
    );
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json().profile.toolProfile).toEqual(unspecified);
  });
  it("enregistre, recharge, exporte et conserve les métadonnées lors d’une correction ancienne", async () => {
    const user = await account("body-tools@example.test");
    await call(
      "POST",
      "/api/onboarding",
      { height: 180, consent: true, version: CONSENT_VERSION, goal: null },
      user.cookie,
    );
    const { newToolContext } = await import("../shared/body-tools");
    const tools = {
      ...newToolContext({ birthDate: "1996-10-06", equation: "female" }),
      situation: "none",
      waistProtocol: "nice-midpoint",
      rfmWaistProtocol: "iliac-crest",
      heightDate: "2026-09-01",
      heightOrigin: "session",
    };
    const body = {
      date: "2026-10-06",
      height: 180,
      values: { weight: 80, waist: 90.12345, "waist-rfm": 90 },
      note: "",
      requestId: crypto.randomUUID(),
      tools,
    };
    const saved = await call("POST", "/api/entries", body, user.cookie);
    expect(saved.statusCode).toBe(200);
    expect(saved.json().tools).toEqual(tools);
    const id = saved.json().id;
    const updated = await call(
      "PUT",
      `/api/entries/${id}`,
      { ...body, tools: undefined, note: "Correction" },
      user.cookie,
    );
    expect(updated.statusCode).toBe(200);
    expect(updated.json().tools).toEqual(tools);
    const staleDate = await call(
      "PUT",
      `/api/entries/${id}`,
      { ...body, tools: undefined, date: "2026-08-01" },
      user.cookie,
    );
    expect(staleDate.statusCode).toBe(400);
    const old = await call(
      "POST",
      "/api/entries",
      { ...body, tools: undefined, requestId: crypto.randomUUID() },
      user.cookie,
    );
    expect(old.json().tools).toBeUndefined();
    const accountData = (
      await call("GET", "/api/account", undefined, user.cookie)
    ).json();
    expect(accountData.entries.find((e: any) => e.id === id).tools).toEqual(
      tools,
    );
    const profile = await call(
      "PATCH",
      "/api/profile",
      {
        ...accountData.profile,
        toolProfile: { birthDate: "1996-10-06", equation: "male" },
        heightDate: "2026-09-01",
      },
      user.cookie,
    );
    expect(profile.statusCode).toBe(200);
    expect(profile.json().profile.toolProfile.equation).toBe("male");
    expect(
      profile.json().entries.find((e: any) => e.id === id).tools.equation,
    ).toBe("female");
    const json = (
      await call("POST", "/api/export", { format: "json" }, user.cookie)
    ).json();
    expect(json.schemaVersion).toBe(2);
    expect(json.entries.find((e: any) => e.id === id).tools).toEqual(tools);
    const csv = await call(
      "POST",
      "/api/export",
      { format: "csv" },
      user.cookie,
    );
    expect(csv.body).toContain("90.12345");
    expect(csv.body).toContain("nice-midpoint");
    expect(csv.body).toContain("version_contexte");
    const bad = await call(
      "POST",
      "/api/entries",
      {
        ...body,
        tools: { ...tools, rfmWaistProtocol: "nice-midpoint" },
        requestId: crypto.randomUUID(),
      },
      user.cookie,
    );
    expect(bad.statusCode).toBe(400);
    const removed = await call(
      "POST",
      "/api/consents",
      { purpose: "body", granted: false, version: CONSENT_VERSION },
      user.cookie,
    );
    expect(removed.statusCode).toBe(200);
    const empty = (
      await call("GET", "/api/account", undefined, user.cookie)
    ).json();
    expect(empty.entries).toEqual([]);
    expect(empty.profile.toolProfile).toBeUndefined();
    expect(empty.profile.heightDate).toBeNull();
  });
});
