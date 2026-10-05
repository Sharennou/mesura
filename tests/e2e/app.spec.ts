import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
test("les écrans mobiles gardent une navigation et une mise en page accessibles", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Nouvelle mesure" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Mesures", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const before = await page.getByLabel("Poids", { exact: true }).inputValue();
  await page
    .getByRole("button", { name: "Augmenter le poids de 0,1 kilogramme" })
    .click();
  expect(await page.getByLabel("Poids", { exact: true }).inputValue()).not.toBe(
    before,
  );
  for (const screen of [
    "measure",
    "analysis",
    "reminder",
    "compare",
    "monthly",
    "photos",
    "favorites",
    "goal",
    "history",
    "account",
    "legal",
  ]) {
    await page.goto(`/#${screen}`);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Pas de débordement : ${screen}`,
    ).toBe(true);
    const violations = (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations;
    expect(
      violations.map(
        (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`,
      ),
      screen,
    ).toEqual([]);
  }
  await page.goto("/#analysis");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-analysis.png`,
    fullPage: true,
  });
  await page.goto("/#measure");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-measure.png`,
    fullPage: true,
  });
  await page.goto("/#reminder");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-reminder.png`,
    fullPage: true,
  });
});
test("compte réel : consentement, sauvegarde, photos, correction, export et suppression", async ({
  page,
  context,
}, testInfo) => {
  const email = `parcours-${testInfo.project.name}-${Date.now()}@example.test`;
  const password = "MonEspacePrive!2026";
  await page.goto("/#account");
  await page.getByLabel("Votre pseudonyme").fill("Camille");
  await page.getByLabel("Adresse email", { exact: true }).fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Créer mon espace", exact: true })
    .click();
  await page.getByRole("link", { name: "Vérifier mon adresse" }).click();
  await expect(
    page.getByRole("heading", { name: "Mon espace", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choisir mes consentements" }).click();
  const bodyConsent = page.locator(".consent-card").filter({
    has: page.getByRole("heading", { name: "Suivi corporel", exact: true }),
  });
  await bodyConsent.getByRole("checkbox").check();
  await bodyConsent
    .getByRole("button", { name: "Enregistrer mon choix" })
    .click();
  await expect(
    bodyConsent.getByText("Autorisé", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mesures", exact: true }).click();
  await expect(page.getByLabel("Poids", { exact: true })).toHaveValue("");
  await page.getByLabel("Poids", { exact: true }).fill("78,4");
  await page.getByLabel("Tour de taille en cm").fill("84.0");
  await page
    .getByLabel("Note de cette entrée")
    .fill("Mon repère privé <script>alert(1)</script>");
  await page.route("**/api/entries", (route) => route.abort());
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("connexion");
  await expect(page.getByLabel("Poids", { exact: true })).toHaveValue("78,4");
  await expect(
    page.getByText("Mesure enregistrée", { exact: true }),
  ).not.toBeVisible();
  await page.unroute("**/api/entries");
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await expect(
    page.getByText("Mesure enregistrée", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-success.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Voir mon analyse", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Analyse", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".graph-value")).toContainText("78,4");
  await page.reload();
  await expect(page.locator(".graph-value")).toContainText("78,4");
  await page
    .getByRole("button", { name: "Mon compte et mes réglages" })
    .click();
  await page.getByRole("button", { name: "Me déconnecter" }).click();
  await page.getByRole("button", { name: "Mon espace", exact: true }).click();
  await page
    .getByRole("button", { name: "Déjà un compte ? Me connecter" })
    .click();
  await page.getByLabel("Adresse email", { exact: true }).fill(email);
  await page.getByLabel("Mot de passe", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Me connecter", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nouvelle mesure", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await expect(page.locator(".graph-value")).toContainText("78,4");
  await page.getByRole("button", { name: "Voir l’historique" }).click();
  await expect(page.locator(".saved-note")).toHaveText(
    "Mon repère privé <script>alert(1)</script>",
  );
  await page.getByRole("button", { name: /Modifier l’entrée/ }).click();
  await page.getByLabel("Poids", { exact: true }).fill("79.0");
  await page
    .getByRole("button", { name: "Enregistrer les modifications" })
    .click();
  await page.getByRole("button", { name: "Voir mon analyse" }).click();
  await expect(page.locator(".graph-value")).toContainText("79,0");
  await page.getByRole("button", { name: "Mesures", exact: true }).click();
  await page.getByLabel("Note de cette entrée").fill("Une photo privée");
  await page.locator("label.photo-upload").first().click();
  await page.getByRole("dialog").getByRole("checkbox").check();
  await page.getByRole("button", { name: "Autoriser mes photos" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const photo = await sharp({
    create: { width: 120, height: 160, channels: 3, background: "#D7FF3F" },
  })
    .jpeg()
    .toBuffer();
  await page.getByLabel("Ajouter une photo de face").setInputFiles({
    name: "photo.jpg",
    mimeType: "image/jpeg",
    buffer: photo,
  });
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await expect(page.getByText("1 photo privée")).toBeVisible();
  await page.goto("/#photos");
  await expect(page.locator(".photo-gallery img")).toBeVisible();
  expect(
    await page
      .locator(".photo-gallery img")
      .evaluate((el: HTMLImageElement) => el.naturalWidth),
  ).toBe(120);
  const cachedPrivate = await page.evaluate(async () => {
    const names = await caches.keys();
    const keys = await Promise.all(
      names.map(async (name) => (await caches.open(name)).keys()),
    );
    return keys
      .flat()
      .filter((request) => new URL(request.url).pathname.startsWith("/api/"))
      .length;
  });
  expect(cachedPrivate).toBe(0);
  await page.goto("/#privacy");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger mes données" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
  await page
    .getByRole("button", { name: "Supprimer mon compte", exact: true })
    .click();
  await page.getByLabel("Mot de passe actuel").fill(password);
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page.getByText("Aperçu · données fictives")).toBeVisible();
  const cookie = await context.cookies();
  expect(cookie.filter((c) => c.name.includes("session_token")).length).toBe(0);
});
