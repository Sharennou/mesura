import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { CONSENT_VERSION } from "../../shared/config";
import { localDate } from "../../shared/calculations";
import { onboardingTools } from "../onboarding-fixture";
import { newToolContext } from "../../shared/body-tools";

// Calculations work directly from registration and measurement fields, without
// the removed session settings or shortcuts inside the analysis cards.
test("analyse approfondie : profil, dates lisibles, calculs et correction par l’historique", async ({
  page,
}, info) => {
  const headers = {
    Origin: "http://127.0.0.1:5181",
    "x-requested-with": "Mesura",
  };
  const today = localDate("Europe/Paris");
  const birthDate = `${Number(today.slice(0, 4)) - 30}${today.slice(4)}`;
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${today}T12:00:00Z`));
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers,
    data: {
      name: "Test Analyse",
      email: `tools-${crypto.randomUUID()}@example.test`,
      password: "ParcoursUX!2026",
    },
  });
  expect(signup.ok()).toBe(true);
  const onboard = await page.request.post("/api/onboarding", {
    headers,
    data: {
      ...onboardingTools,
      toolProfile: { birthDate, equation: "male" },
      height: 180,
      consent: true,
      version: CONSENT_VERSION,
      goal: null,
    },
  });
  expect(onboard.ok()).toBe(true);
  await page.goto("/#analysis");
  await expect(
    page.getByRole("heading", { name: "Analyse approfondie", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".tool-value")).not.toContainText(["24,0", "1780"]);
  // A saved normal waist measurement is sufficient, even when its old
  // protocol metadata is unknown. Keep that metadata without showing an alert.
  const legacyTools = newToolContext({ birthDate, equation: "male" });
  const legacy = await page.request.post("/api/entries", {
    headers,
    data: {
      date: today,
      height: 180,
      values: { weight: 80, waist: 90 },
      tools: legacyTools,
      note: "",
      requestId: crypto.randomUUID(),
    },
  });
  expect(legacy.ok()).toBe(true);
  const legacyEntry = await legacy.json();
  await page.reload();
  const normalWaist = page.getByRole("article", {
    name: "Tour de taille / hauteur",
    exact: true,
  });
  await expect(normalWaist.locator(".tool-value")).toHaveText(
    "0,50 (sans unité)",
  );
  await expect(normalWaist.locator(".tool-state")).toHaveCount(0);
  await expect(normalWaist.locator(".indicator-explanation")).toHaveCount(0);
  await expect(page.getByRole("article", { name: /RFM/ })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Prendre une nouvelle mesure guidée" })
    .click();
  await expect(
    page.getByText("Données pour les outils", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Guide : Poids", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Poids", { exact: true }).fill("80");
  await page.getByLabel("Tour de taille en cm", { exact: true }).fill("90");
  await page.getByLabel("Hanches en cm", { exact: true }).fill("100");
  await page
    .getByRole("button", { name: "Personnaliser", exact: true })
    .click();
  await expect(page.getByRole("checkbox", { name: /RFM/ })).toHaveCount(0);
  await page
    .getByRole("checkbox", { name: "Poitrine cm", exact: true })
    .check();
  await page.getByRole("button", { name: "Enregistrer mes favoris" }).click();
  await page.getByLabel("Poitrine en cm", { exact: true }).fill("95");
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Voir mon analyse", exact: true })
    .click();
  const energy = page.getByRole("article", {
    name: "Dépense énergétique au repos estimée",
  });
  const abdomen = page.getByRole("article", {
    name: "Tour de taille / hauteur",
  });
  await expect(page.getByRole("article", { name: /RFM/ })).toHaveCount(0);
  await expect(energy.locator(".tool-value")).toHaveText("1780 kcal/jour");
  await expect(abdomen).toContainText("Adiposité abdominale augmentée");
  await expect(abdomen.locator(".indicator-explanation")).toHaveCount(0);
  await expect(
    page.getByLabel("Séance analysée").getByRole("option"),
  ).toHaveText([formattedDate, formattedDate]);
  await expect(page.locator(".tools-section > p")).toHaveCount(0);
  await expect(page.locator(".tool-card summary")).toHaveText(
    Array(4).fill("Comprendre le calcul"),
  );
  await expect(
    page.getByText("Sources et limites", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/Données utilisées/)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Compléter ou corriger cette séance" }),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Situation déclarée|situation n’est pas renseignée/),
  ).toHaveCount(0);
  await energy
    .getByText("Comprendre le calcul", { exact: true })
    .press("Enter");
  await expect(energy.getByText(/Mifflin–St Jeor/)).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/tools-${info.project.name}.png`,
    fullPage: true,
  });

  // Correct a value through the ordinary history flow; its original profile
  // snapshot and protocol stay attached to that session.
  await page.goto("/#history");
  await page
    .getByRole("button", { name: /Consulter la mesure du/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Modifier la mesure", exact: true })
    .click();
  await expect(
    page.getByText("Données pour les outils", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Tour de taille en cm", { exact: true })
    .fill("89,9999");
  await page
    .getByRole("button", { name: "Enregistrer les modifications", exact: true })
    .click();
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await expect(energy.locator(".tool-value")).toHaveText("1780 kcal/jour");
  await expect(abdomen).toContainText("dans la plage de référence");
  await expect(abdomen.locator(".tool-value")).not.toHaveText(
    "0,50 (sans unité)",
  );
  await page.reload();
  await expect(energy.locator(".tool-value")).toHaveText("1780 kcal/jour");
  const data = await (await page.request.get("/api/account")).json();
  expect(data.entries[0].values.waist).toBe(89.9999);
  expect(data.entries[0].tools).toMatchObject({
    birthDate,
    equation: "male",
    waistProtocol: "nice-midpoint",
    heightDate: null,
  });
  expect(data.entries[0].tools).not.toHaveProperty("situation");
  expect(data.entries[0].tools).not.toHaveProperty("rfmWaistProtocol");
  expect(
    data.entries.find((e: { id: string }) => e.id === legacyEntry.id).tools,
  ).toEqual(legacyTools);

  // A profile change is used by the next entry and leaves the saved one intact.
  await page.goto("/#profile");
  await expect(page.getByLabel("Votre situation actuelle")).toHaveCount(0);
  await expect(page.getByText(/RFM/)).toHaveCount(0);
  await page.getByLabel("Sexe utilisé pour les calculs").selectOption("female");
  await page.getByRole("button", { name: "Enregistrer mon profil" }).click();
  await expect(
    page.getByText("Profil enregistré.", { exact: true }),
  ).toBeVisible();
  await page.goto("/#measure");
  await page.getByLabel("Poids", { exact: true }).fill("80");
  await page
    .getByLabel("Tour de taille en cm", { exact: true })
    .fill("89,9999");
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Voir mon analyse", exact: true })
    .click();
  await expect(energy.locator(".tool-value")).toHaveText("1614 kcal/jour");
  await page.getByLabel("Séance analysée").selectOption(data.entries[0].id);
  await expect(energy.locator(".tool-value")).toHaveText("1780 kcal/jour");
  await expect(
    page.getByLabel("Séance analysée").getByRole("option"),
  ).toHaveText([formattedDate, formattedDate, formattedDate]);
  await page.request.delete("/api/account", {
    headers,
    data: { password: "ParcoursUX!2026" },
  });
});
