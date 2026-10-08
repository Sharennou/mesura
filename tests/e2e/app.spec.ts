import sharp from "sharp";
import { test, expect } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

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

test("compte réel : accessibilité, consentement, sauvegarde, correction, export et suppression", async ({
  page,
  context,
}, testInfo) => {
  test.slow();
  const email = `parcours-${testInfo.project.name}-${Date.now()}@example.test`;
  const password = "MonEspacePrive!2026";
  const year = Number(
    new Intl.DateTimeFormat("fr", {
      year: "numeric",
      timeZone: "Europe/Paris",
    }).format(new Date()),
  );
  const birthDate = `${year - 30}-01-01`;
  const correctedBirthDate = `${year - 31}-01-01`;
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
  await page.getByLabel("Votre hauteur en cm").fill("175,5");
  await expect(page.getByLabel("Date de naissance")).toHaveValue("");
  await expect(page.getByLabel("Sexe utilisé pour les calculs")).toHaveValue(
    "",
  );
  await expect(page.getByRole("status")).toContainText(
    "Âge actuel : Non renseigné",
  );
  await page.getByLabel("Votre objectif").selectOption("observe");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Commencer mon suivi" }).click();
  await expect(
    page.getByRole("heading", { name: "Votre point de départ.", exact: true }),
  ).toBeVisible();
  expect(
    (await (await page.request.get("/api/account")).json()).profile
      .onboardingCompleted,
  ).toBe(false);
  await page.getByLabel("Date de naissance").fill(birthDate);
  await expect(page.getByRole("status")).toContainText("Âge actuel : 30 ans");
  await page.getByLabel("Sexe utilisé pour les calculs").selectOption("female");
  await page.getByLabel("Votre situation actuelle").selectOption("none");
  await page
    .getByLabel("Date de mesure de la hauteur", { exact: true })
    .fill("2000-01-01");
  await page
    .getByLabel("Protocole du tour de taille", { exact: true })
    .selectOption("nice-midpoint");
  await page
    .getByLabel("Protocole de la mesure spécifique RFM")
    .selectOption("unknown");
  await page.getByLabel("Votre objectif").selectOption("observe");
  await page.getByRole("checkbox").check();
  await page.route("**/api/onboarding", (route) => route.abort());
  await page.getByRole("button", { name: "Commencer mon suivi" }).click();
  await expect(page.getByRole("alert")).toContainText("connexion");
  await expect(page.getByLabel("Votre hauteur en cm")).toHaveValue("175,5");
  await expect(page.getByLabel("Date de naissance")).toHaveValue(birthDate);
  await expect(page.getByLabel("Sexe utilisé pour les calculs")).toHaveValue(
    "female",
  );
  expect(
    (await (await page.request.get("/api/account")).json()).consents.body,
  ).toBe(false);
  await page.unroute("**/api/onboarding");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-onboarding-profile.png`,
    fullPage: true,
  });
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
  expect(setup.profile.visible).toEqual(["waist", "hips"]);
  await expect(page.locator(".measure-tile")).toHaveCount(2);
  await expect(page.getByLabel("Poitrine en cm", { exact: true })).toHaveCount(
    0,
  );
  expect(setup.profile).toMatchObject({
    height: 175.5,
    onboardingCompleted: true,
    toolProfile: { birthDate, equation: "female" },
  });
  expect(setup.consents).toEqual({
    body: true,
    photos: false,
    push: false,
    email: false,
  });
  await page.getByText("Données pour les outils", { exact: true }).click();
  await expect(page.getByLabel("Date de naissance")).toHaveValue(birthDate);
  await expect(
    page.getByLabel("Équation pour le RFM et la dépense au repos"),
  ).toHaveValue("female");
  await expect(page.getByLabel("Situation à la date de la séance")).toHaveValue(
    "none",
  );
  await expect(
    page.getByLabel("Protocole du tour de taille", { exact: true }),
  ).toHaveValue("nice-midpoint");
  await expect(
    page.getByLabel("Date de mesure de la hauteur", { exact: true }),
  ).toHaveValue("2000-01-01");
  await page.goto("/#reminder");
  await page.getByRole("button", { name: "Mercredi", exact: true }).click();
  await page.getByRole("button", { name: "Vendredi", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Lundi", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Enregistrer le rappel" }).click();
  await expect(
    page.getByText("Horaires enregistrés.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  for (const day of ["Lundi", "Mercredi", "Vendredi"])
    await expect(
      page.getByRole("button", { name: day, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  expect(
    (await (await page.request.get("/api/account")).json()).reminder.weekdays,
  ).toEqual([1, 3, 5]);
  await page.goto("/#account");
  await page.getByRole("button", { name: /^Profil / }).click();
  await expect(page.getByLabel("Pseudo", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Date de naissance")).toBeVisible();
  await expect(page.getByLabel("Date de naissance")).toHaveValue(birthDate);
  await expect(page.getByLabel("Sexe utilisé pour les calculs")).toHaveValue(
    "female",
  );
  await page.getByLabel("Date de naissance").fill(correctedBirthDate);
  await expect(
    page.getByText("Âge actuel : 31 ans.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Sexe utilisé pour les calculs").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Votre situation actuelle")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByLabel("Date de mesure de la hauteur du profil"),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByLabel("Votre situation actuelle")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByLabel("Sexe utilisé pour les calculs")).toBeFocused();
  await page.getByLabel("Sexe utilisé pour les calculs").selectOption("male");
  await expect(page.getByLabel("Sexe utilisé pour les calculs")).toHaveValue(
    "male",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-profile-age-sex.png`,
    fullPage: true,
  });
  await expect(page.getByText("Fuseau horaire", { exact: true })).toHaveCount(
    0,
  );
  const avatarBytes = await sharp({
    create: { width: 240, height: 160, channels: 3, background: "#c5ee22" },
  })
    .png()
    .toBuffer();
  await page.locator('input[type="file"]').setInputFiles({
    name: "profil.png",
    mimeType: "image/png",
    buffer: avatarBytes,
  });
  await expect(page.getByAltText("Votre photo de profil")).toBeVisible();
  await page.getByRole("button", { name: "Enregistrer mon profil" }).click();
  await expect(
    page.getByText("Profil enregistré.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByAltText("Votre photo de profil")).toBeVisible();
  const withAvatar = await (await page.request.get("/api/account")).json();
  expect(withAvatar.profile.toolProfile).toMatchObject({
    birthDate: correctedBirthDate,
    equation: "male",
  });
  await expect(page.getByLabel("Date de naissance")).toHaveValue(
    correctedBirthDate,
  );
  await expect(page.getByLabel("Sexe utilisé pour les calculs")).toHaveValue(
    "male",
  );
  await expect(
    page
      .getByRole("button", { name: "Mon compte et mes réglages" })
      .locator("img"),
  ).toHaveAttribute("src", withAvatar.profile.avatar);
  const accountButton = page.getByRole("button", {
    name: "Mon compte et mes réglages",
  });
  const buttonBounds = await accountButton.boundingBox();
  const imageBounds = await accountButton.locator("img").boundingBox();
  expect(imageBounds).toEqual(buttonBounds);
  expect(imageBounds!.width).toBe(imageBounds!.height);
  await expect(accountButton).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  expect(withAvatar.profile.avatar).toMatch(/^data:image\/jpeg;base64,/);
  expect(withAvatar.profile.timezone).toBe(setup.profile.timezone);
  await page.getByRole("button", { name: "Retirer la photo" }).click();
  await page.getByRole("button", { name: "Enregistrer mon profil" }).click();
  await expect(
    page.getByText("Profil enregistré.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByAltText("Votre photo de profil")).toHaveCount(0);
  await expect(
    page
      .getByRole("button", { name: "Mon compte et mes réglages" })
      .locator("img"),
  ).toHaveCount(0);
  await page.goto("/#measure");
  await page.getByText("Données pour les outils", { exact: true }).click();
  await expect(page.getByLabel("Date de naissance")).toHaveValue(
    correctedBirthDate,
  );
  await expect(
    page.getByLabel("Équation pour le RFM et la dépense au repos"),
  ).toHaveValue("male");
  await page.getByText("Données pour les outils", { exact: true }).click();
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
  await page.getByText("Ajouter une note", { exact: false }).click();
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
    page.getByRole("heading", { name: "Mesure enregistrée", exact: true }),
  ).not.toBeVisible();
  await page.unroute("**/api/entries");
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mesure enregistrée", exact: true }),
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
  await page
    .getByRole("button", { name: "Historique des mesures", exact: true })
    .click();
  await page
    .getByRole("button", { name: /Consulter la mesure du/ })
    .first()
    .click();
  await expect(page.locator(".saved-note")).toHaveText(
    "Mon repère privé <script>alert(1)</script>",
  );
  await page
    .getByRole("button", { name: "Modifier la mesure", exact: true })
    .click();
  await page.getByLabel("Poids", { exact: true }).fill("79.0");
  await page
    .getByRole("button", { name: "Enregistrer les modifications" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Détail de la mesure" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await expect(page.locator(".graph-value")).toContainText("79,0");
  await page.getByRole("button", { name: "Mesures", exact: true }).click();
  await page.getByText("Ajouter une note", { exact: false }).click();
  await page.getByLabel("Note de cette entrée").fill("Une note privée");
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mesure enregistrée", exact: true }),
  ).toBeVisible();
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
    const smallTargets = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          "button, summary, input, select, textarea, svg [role=button]",
        ),
      ]
        .filter((element) => element.getClientRects().length)
        .flatMap((element) => {
          const hitArea = element.matches("input,select,textarea")
            ? (element.closest("label") ?? element)
            : element;
          const rect = hitArea.getBoundingClientRect();
          if (!rect.width || !rect.height) return [];
          return rect.width < 43.9 || rect.height < 43.9
            ? [
                {
                  name:
                    element.getAttribute("aria-label") ??
                    element.textContent?.trim().slice(0, 60),
                  width: rect.width,
                  height: rect.height,
                },
              ]
            : [];
        }),
    );
    expect(smallTargets, `Cibles tactiles de 44 px : ${screen}`).toEqual([]);
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
