import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";

test("la connexion est obligatoire, y compris pendant le chargement et par lien direct", async ({
  page,
}) => {
  let releaseSession!: () => void;
  const sessionReady = new Promise<void>((resolve) => {
    releaseSession = resolve;
  });
  await page.route("**/api/auth/get-session**", async (route) => {
    await sessionReady;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByText("Vérification de votre connexion…"),
  ).toBeVisible();
  await expect(page.getByLabel("Poids", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  releaseSession();
  await expect(
    page.getByRole("button", { name: "Créer mon espace", exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/auth/get-session**");
  await page
    .getByRole("button", { name: "Déjà un compte ? Me connecter" })
    .click();
  await expect(
    page.getByRole("button", { name: "Me connecter", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Des repères pour vous.")).toHaveCount(0);
  await page.getByRole("button", { name: "Mot de passe oublié ?" }).click();
  await expect(
    page.getByRole("button", { name: "Recevoir un lien", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Créer mon espace", exact: true })
    .click();
  for (const screen of [
    "measure",
    "analysis",
    "reminder",
    "success",
    "privacy",
    "history",
    "photos",
    "compare",
    "monthly",
    "goal",
    "favorites",
  ]) {
    await page.goto(`/#${screen}`);
    await expect(
      page.getByRole("heading", { name: "Votre espace à vous.", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Régler mon rappel" }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Poids", { exact: true })).toHaveCount(0);
    await expect(page.locator(".graph-card,.demo-banner")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /Continuer la découverte/ }),
    ).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect((await page.request.get("/api/account")).status()).toBe(401);
  await page
    .getByRole("button", { name: "conditions d’utilisation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Conditions d’utilisation",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.getByRole("button", { name: "Revenir", exact: true }).click();
  await expect(page.getByLabel("Adresse email", { exact: true })).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("compte réel : accessibilité, consentement, sauvegarde, photos, correction, export et suppression", async ({
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
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Votre point de départ.", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("checkbox")).toHaveCount(1);
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.getByLabel("Votre taille en cm").fill("175,5");
  await page.getByLabel("Votre objectif").selectOption("observe");
  await page.getByRole("checkbox").check();
  await page.route("**/api/onboarding", (route) => route.abort());
  await page.getByRole("button", { name: "Commencer mon suivi" }).click();
  await expect(page.getByRole("alert")).toContainText("connexion");
  await expect(page.getByLabel("Votre taille en cm")).toHaveValue("175,5");
  expect(
    (await (await page.request.get("/api/account")).json()).consents.body,
  ).toBe(false);
  await page.unroute("**/api/onboarding");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Commencer mon suivi" }).click();
  await expect(
    page.getByRole("heading", { name: "Nouvelle mesure", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Nouvelle mesure", exact: true }),
  ).toBeVisible();
  const setup = await (await page.request.get("/api/account")).json();
  expect(setup.profile).toMatchObject({
    height: 175.5,
    onboardingCompleted: true,
  });
  expect(setup.consents).toEqual({
    body: true,
    photos: false,
    push: false,
    email: false,
  });
  await expect(page.getByLabel("Poids", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Tour de taille en cm")).toHaveValue("");
  await expect(page.getByLabel("Note de cette entrée")).toHaveValue("");
  expect(
    (await (await page.request.get("/api/account")).json()).entries,
  ).toEqual([]);
  expect(
    (await (await page.request.get("/api/account")).json()).goal,
  ).toBeNull();
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
  await expect(page.getByLabel("Adresse email", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.goto("/#analysis");
  await expect(
    page.getByRole("heading", { name: "Votre espace à vous.", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".graph-value")).toHaveCount(0);
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
  await page.goto("/#privacy");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger mes données" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
  await page
    .getByRole("button", { name: "Supprimer mon compte", exact: true })
    .click();
  await page.getByLabel("Mot de passe actuel").fill(password);
  await page.getByRole("button", { name: "Supprimer définitivement" }).click();
  await expect(page.getByLabel("Adresse email", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await expect(page.locator(".demo-banner")).toHaveCount(0);
  const cookie = await context.cookies();
  expect(cookie.filter((c) => c.name.includes("session_token")).length).toBe(0);
});
