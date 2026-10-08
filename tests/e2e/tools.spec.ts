import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { CONSENT_VERSION } from "../../shared/config";
import { localDate } from "../../shared/calculations";
import { onboardingTools } from "../onboarding-fixture";

test("outils : calculs, protocoles, précision, dates, clavier et conservation", async ({
  page,
}, info) => {
  const headers = {
    Origin: "http://127.0.0.1:5181",
    "x-requested-with": "Mesura",
  };
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers,
    data: {
      name: "Test Outils",
      email: `tools-${crypto.randomUUID()}@example.test`,
      password: "ParcoursUX!2026",
    },
  });
  expect(signup.ok()).toBe(true);
  expect(
    (
      await page.request.post("/api/onboarding", {
        headers,
        data: {
          ...onboardingTools,
          height: 180,
          consent: true,
          version: CONSENT_VERSION,
          goal: null,
        },
      })
    ).ok(),
  ).toBe(true);
  await page.goto("/#analysis");
  await expect(
    page.getByRole("heading", { name: "Outils", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".tool-value")).not.toContainText(["24,0", "1780"]);
  await page
    .getByRole("button", { name: "Prendre une nouvelle mesure guidée" })
    .click();
  await page.getByLabel("Poids", { exact: true }).fill("80");
  await page.getByLabel("Tour de taille en cm", { exact: true }).fill("90");
  await page
    .getByRole("button", { name: "Personnaliser", exact: true })
    .click();
  await page.getByRole("checkbox", { name: "Tour de taille — RFM" }).check();
  await page.getByRole("button", { name: "Enregistrer mes favoris" }).click();
  await page
    .getByLabel("Tour de taille — RFM en cm", { exact: true })
    .fill("90");
  await page
    .getByText("Données pour les outils", { exact: true })
    .press("Enter");
  const today = localDate("Europe/Paris");
  const birth = `${Number(today.slice(0, 4)) - 30}${today.slice(4)}`;
  await page.getByLabel("Date de naissance").fill(birth);
  await page.getByLabel("Équation pour le RFM").selectOption("male");
  await page.getByLabel("Situation à la date").selectOption("none");
  await page
    .getByLabel("Date de mesure de la hauteur", { exact: true })
    .fill(today);
  await page
    .getByLabel("Protocole du tour de taille", { exact: true })
    .selectOption("nice-midpoint");
  await page
    .getByLabel("Protocole de la mesure spécifique RFM")
    .selectOption("iliac-crest");
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Voir mon analyse", exact: true })
    .click();
  const rfm = page.getByRole("article", { name: "Masse grasse estimée — RFM" });
  const energy = page.getByRole("article", {
    name: "Dépense énergétique au repos estimée",
  });
  const abdomen = page.getByRole("article", {
    name: "Adiposité abdominale — tour de taille / hauteur",
  });
  await expect(rfm.locator(".tool-value")).toHaveText("24,0 %");
  await expect(energy.locator(".tool-value")).toHaveText("1780 kcal/jour");
  await expect(abdomen).toContainText("Adiposité abdominale augmentée");
  await rfm.getByText("Comprendre le calcul", { exact: true }).press("Enter");
  await expect(rfm.getByText(/64 − 20/)).toBeVisible();
  await rfm.getByText("Sources et limites", { exact: true }).press("Enter");
  await expect(
    rfm.getByRole("link", { name: /Relative fat mass/ }),
  ).toHaveAttribute(
    "href",
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC6054651/",
  );
  await rfm
    .getByText(`Données utilisées · ${today}`, { exact: true })
    .press("Enter");
  await expect(rfm).toContainText("30 ans");
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
  await rfm
    .getByRole("button", { name: "Compléter ou corriger cette séance" })
    .click();
  await page.getByText("Données pour les outils", { exact: true }).click();
  await page.getByLabel("Équation pour le RFM").selectOption("female");
  await page
    .getByLabel("Tour de taille en cm", { exact: true })
    .fill("89,9999");
  await page
    .getByRole("button", { name: "Enregistrer les modifications", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Analyse", exact: true }),
  ).toBeVisible();
  await expect(rfm.locator(".tool-value")).toHaveText("36,0 %");
  await expect(energy.locator(".tool-value")).toHaveText("1614 kcal/jour");
  await expect(abdomen).toContainText("dans la plage de référence");
  await expect(abdomen.locator(".tool-value")).not.toHaveText(
    "0,50 (sans unité)",
  );
  await page.reload();
  await expect(rfm.locator(".tool-value")).toHaveText("36,0 %");
  const account = (await page.request.get("/api/account")).json();
  const data = await account;
  expect(data.entries[0].values.waist).toBe(89.9999);
  await rfm
    .getByRole("button", { name: "Compléter ou corriger cette séance" })
    .click();
  await page.getByText("Données pour les outils", { exact: true }).click();
  await page.getByLabel("Situation à la date").selectOption("pregnancy");
  await page
    .getByRole("button", { name: "Enregistrer les modifications", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Analyse", exact: true }),
  ).toBeVisible();
  await expect(rfm.locator(".tool-value")).toHaveText("Non disponible");
  await expect(rfm).toContainText("suspendues");
  await expect(abdomen.locator(".tool-class")).toHaveCount(0);
  await page.request.delete("/api/account", {
    headers,
    data: { password: "ParcoursUX!2026" },
  });
});
