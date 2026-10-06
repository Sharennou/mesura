import { test, expect, type Page } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";
import { mkdir } from "node:fs/promises";
import { emptyAccountData } from "../../src/account-data";
import { CONSENT_VERSION } from "../../shared/config";
import { localDate, shiftDate } from "../../shared/calculations";

async function setup(page: Page) {
  const origin = "http://127.0.0.1:5181";
  const headers = { Origin: origin, "x-requested-with": "Mesura" };
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers,
    data: {
      name: "Test UX",
      email: `ux-${crypto.randomUUID()}@example.test`,
      password: "ParcoursUX!2026",
    },
  });
  expect(signup.ok()).toBe(true);
  const onboard = await page.request.post("/api/onboarding", {
    headers,
    data: { height: 175, consent: true, version: CONSENT_VERSION, goal: null },
  });
  expect(onboard.ok()).toBe(true);
  return headers;
}

async function screenshot(
  page: Page,
  name: string,
  project: string,
  scrollToTop = true,
) {
  await expect(page.locator(".toast")).toHaveCount(0);
  await page.evaluate((resetScroll) => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    if (resetScroll) window.scrollTo(0, 0);
  }, scrollToTop);
  await mkdir(".runtime/ux-captures", { recursive: true });
  await page.screenshot({
    path: `.runtime/ux-captures/${project}-${name}-phone.png`,
  });
  await page.screenshot({
    path: `.runtime/ux-captures/${project}-${name}.png`,
    fullPage: true,
  });
}

test("première mesure, brouillon et réponse perdue : sauvegarde sans doublon", async ({
  page,
}, info) => {
  await setup(page);
  await page.goto("/#measure");
  await expect(
    page.getByRole("heading", { name: "Nouvelle mesure" }),
  ).toBeVisible();
  const waist = page.getByLabel("Tour de taille en cm");
  const input = await waist.boundingBox();
  const bar = await page.locator(".action-bar").boundingBox();
  expect(input!.y + 44).toBeLessThan(bar!.y);
  await screenshot(page, "mesures", info.project.name);
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Enregistrer ma première mesure" }),
  ).toBeVisible();
  await expect(
    page.locator(".chart,.projection-card,.indicator-card"),
  ).toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await screenshot(page, "analyse-vide", info.project.name);
  await page
    .getByRole("button", { name: "Enregistrer ma première mesure" })
    .click();
  await page.getByLabel("Poids", { exact: true }).fill("80,5");
  await waist.fill("88,2");
  await page.getByText("Ajouter une note", { exact: false }).click();
  await page.getByLabel("Note de cette entrée").fill("Brouillon de test");
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await page.getByRole("button", { name: "Régler mon rappel" }).click();
  await page.getByRole("button", { name: "Revenir", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Analyse", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Mon compte et mes réglages" })
    .click();
  await expect(page.getByRole("button", { name: /^Profil / })).toBeVisible();
  await screenshot(page, "compte", info.project.name);
  await expect(page.getByLabel("Pseudo", { exact: true })).toHaveCount(0);
  await page.goBack();
  await page.getByRole("button", { name: "Mesures", exact: true }).click();
  await expect(page.getByLabel("Poids", { exact: true })).toHaveValue("80,5");
  await expect(waist).toHaveValue("88,2");
  await expect(page.getByLabel("Note de cette entrée")).toHaveValue(
    "Brouillon de test",
  );
  let requests = 0;
  await page.route("**/api/entries", async (route) => {
    requests++;
    await route.fetch();
    await route.abort();
  });
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("connexion");
  await expect(
    page.getByRole("heading", { name: "Mesure enregistrée", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Poids", { exact: true })).toHaveValue("80,5");
  // Navigation after a lost response must retain the original idempotency key.
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Analyse", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mesures", exact: true }).click();
  await page.unroute("**/api/entries");
  let retryRequests = 0;
  await page.route("**/api/entries", async (route) => {
    retryRequests++;
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await route.fulfill({ response });
  });
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .dblclick();
  await expect(
    page.getByRole("heading", { name: "Mesure enregistrée", exact: true }),
  ).toBeVisible();
  const account = await (await page.request.get("/api/account")).json();
  expect(account.entries).toHaveLength(1);
  expect(account.entries[0].values).toEqual({ weight: 80.5, waist: 88.2 });
  expect(requests).toBe(1);
  expect(retryRequests).toBe(1);
  await page
    .getByRole("button", { name: "Voir mon analyse", exact: true })
    .click();
  await expect(
    page.getByText(/Une prochaine mesure, à une autre date/),
  ).toBeVisible();
  await expect(page.locator(".chart,.projection-card")).toHaveCount(0);
  await screenshot(page, "analyse-premiere", info.project.name);
  await page.getByRole("button", { name: "Mesures", exact: true }).click();
  await expect(page.getByLabel("Poids", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Poids", { exact: true })).toHaveAttribute(
    "placeholder",
    "Saisir",
  );
});

test("guide illustré : repères, côtés, mesure personnalisée et brouillon conservé", async ({
  page,
}, info) => {
  const account = emptyAccountData();
  account.profile.onboardingCompleted = true;
  account.consents.body = true;
  account.measures.push({
    id: "custom-test",
    name: "Mon repère",
    unit: "cm",
    custom: true,
  });
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "guide-session",
          userId: "guide-user",
          expiresAt: "2099-01-01T00:00:00Z",
        },
        user: {
          id: "guide-user",
          email: "guide@example.test",
          name: "Test guide",
          emailVerified: false,
        },
      },
    }),
  );
  await page.route("**/api/account", (route) =>
    route.fulfill({ json: account }),
  );
  await page.goto("/#measure");
  const waist = page.getByLabel("Tour de taille en cm");
  await waist.fill("82,4");
  const guide = page.locator(".measurement-guide");
  const summary = guide.locator(":scope > summary");
  await expect(guide).not.toHaveAttribute("open", "");
  const grid = await page.locator(".measurement-grid").first().boundingBox();
  const box = await guide.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(grid!.y + grid!.height);
  await summary.click();
  const choose = page.getByLabel("Quelle mensuration ?");
  await expect(choose).toHaveValue("waist");
  await expect(page.locator(".guide-landmark")).toContainText("dernière côte");
  await expect(choose.locator("optgroup").first()).toHaveAttribute(
    "label",
    "Vos favorites",
  );
  await guide.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await screenshot(page, "guide-taille", info.project.name, false);
  for (const measure of account.measures.filter(
    (m) => m.id !== "weight" && !m.custom,
  )) {
    await choose.selectOption(measure.id);
    await expect(
      guide.getByRole("img", {
        name: new RegExp(`${measure.name} : placement du ruban`),
      }),
    ).toBeVisible();
    await expect(guide.locator(".guide-steps li")).toHaveCount(3);
    if (measure.id.endsWith("-left"))
      await expect(guide.locator(".guide-side")).toContainText("Côté gauche");
    if (measure.id.endsWith("-right"))
      await expect(guide.locator(".guide-side")).toContainText("Côté droit");
  }
  await choose.selectOption("abdomen");
  await expect(guide.locator(".guide-landmark")).toContainText("nombril");
  await choose.selectOption("custom-test");
  await expect(guide.getByText(/choisissez votre propre repère/)).toBeVisible();
  await expect(guide.getByRole("img")).toHaveCount(0);
  await choose.selectOption("biceps-right");
  await guide.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await screenshot(page, "guide-bras", info.project.name, false);
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await page.goBack();
  await expect(choose).toHaveValue("biceps-right");
  await expect(guide).toHaveAttribute("open", "");
  await expect(waist).toHaveValue("82,4");
  await choose.selectOption("thigh-left");
  await guide.evaluate((el) => el.scrollIntoView({ block: "start" }));
  await screenshot(page, "guide-cuisse", info.project.name, false);
  await expect(
    guide.getByText("Bien mesurer à chaque séance", { exact: true }),
  ).toHaveCount(0);
  await expect(guide.getByText("À éviter", { exact: true })).toHaveCount(0);
  await guide.getByText("Méthodes et sources", { exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  for (const control of await guide.locator("summary,select,a").all()) {
    const bounds = await control.boundingBox();
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
  }
  await summary.click();
  await expect(guide).not.toHaveAttribute("open", "");
  await page
    .getByRole("button", { name: "Personnaliser", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mesures favorites", exact: true }),
  ).toBeVisible();
  await page.goBack();
  await expect(waist).toHaveValue("82,4");
  await expect(
    page.getByText("Ajouter d’autres mensurations", { exact: true }),
  ).toHaveCount(0);
});

test("historique, analyse et outils : dates et contexte restaurés", async ({
  page,
}, info) => {
  const headers = await setup(page);
  const today = localDate("Europe/Paris");
  for (let i = 0; i < 8; i++) {
    const entry = {
      date: shiftDate(today, -75 + i * 10),
      values:
        i === 2 ? { waist: 86 } : { weight: 80 + i / 10, waist: 88 - i / 10 },
      note: i === 0 ? "Note ancienne" : "",
      height: 175,
      requestId: crypto.randomUUID(),
    };
    const result = await page.request.post("/api/entries", {
      headers,
      data: entry,
    });
    expect(result.ok()).toBe(true);
  }
  await page.goto("/#measure");
  await page.getByLabel("Poids", { exact: true }).fill("90,3");
  await page
    .getByRole("button", { name: "Historique des mesures", exact: true })
    .click();
  await page
    .locator('.history-filters input[type="month"]')
    .fill(shiftDate(today, -45).slice(0, 7));
  await page.locator(".history-entry").last().scrollIntoViewIfNeeded();
  await screenshot(page, "historique", info.project.name);
  await page.locator(".history-entry").last().scrollIntoViewIfNeeded();
  const historyScroll = await page.evaluate(() => scrollY);
  const filter = await page
    .locator('.history-filters input[type="month"]')
    .inputValue();
  await page.locator(".history-entry").last().click();
  await expect(
    page.getByRole("heading", { name: "Détail de la mesure" }),
  ).toBeVisible();
  await expect(page.getByLabel("Poids", { exact: true })).toHaveCount(0);
  await page
    .getByRole("button", { name: "Modifier la mesure", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Modifier la mesure", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Poids", { exact: true }).fill("81,2");
  await page.getByRole("button", { name: "Régler mon rappel" }).click();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Modifier la mesure", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Poids", { exact: true })).toHaveValue("81,2");

  await page
    .getByRole("button", { name: "Enregistrer les modifications" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Détail de la mesure" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revenir", exact: true }).click();
  await expect(
    page.locator('.history-filters input[type="month"]'),
  ).toHaveValue(filter);
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeCloseTo(historyScroll, 0);
  await page.getByRole("button", { name: "Mesures", exact: true }).click();
  await expect(page.getByLabel("Poids", { exact: true })).toHaveValue("90,3");
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await page
    .getByRole("button", { name: "Tour de taille", exact: true })
    .click();
  await page.getByRole("button", { name: "6M", exact: true }).click();
  await expect(page.locator(".chart")).toBeVisible();
  await screenshot(page, "analyse", info.project.name);
  for (const [name, title] of [
    ["Comparer deux périodes", "Comparer deux périodes"],
    ["Bilan mensuel", "Bilan mensuel"],
  ]) {
    const link = page
      .getByRole("button", { name: new RegExp(`^${name}`) })
      .first();
    await link.scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await link.click();
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await screenshot(
      page,
      title === "Bilan mensuel" ? "bilan" : "comparaison",
      info.project.name,
    );
    if (title === "Comparer deux périodes") {
      await page.getByText("Dates personnalisées", { exact: true }).click();
      await page
        .getByLabel("Période de référence : du", { exact: true })
        .fill(shiftDate(today, -500));
      await page
        .getByLabel("Période de référence : au", { exact: true })
        .fill(shiftDate(today, -490));
      await expect(
        page.getByText(/Aucune valeur de poids dans la période de référence/),
      ).toBeVisible();
      await page
        .getByLabel("Période de référence : du", { exact: true })
        .fill("");
      await expect(page.getByRole("alert")).toBeVisible();
    }
    if (title === "Bilan mensuel") {
      await page
        .getByLabel("Mois du bilan")
        .fill(shiftDate(today, -600).slice(0, 7));
      await expect(
        page.getByText("Aucune entrée ce mois-ci", { exact: true }),
      ).toBeVisible();
      await expect(page.locator(".monthly-hero,.monthly-measure")).toHaveCount(
        0,
      );
      await expect(
        page.getByText("Notes du mois", { exact: true }),
      ).toHaveCount(0);
    }
    await page.goBack();
    await expect(
      page.getByRole("heading", { name: "Analyse", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "6M", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("button", { name: "Tour de taille", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeCloseTo(scroll, 0);
  }
  // Latest known value remains separate when the selected period is empty.
  await page.getByRole("button", { name: "Mesures", exact: true }).click();
  await expect(page.getByLabel("Poids", { exact: true })).toHaveValue("90,3");
  await page.getByRole("button", { name: "Régler mon rappel" }).click();
  await expect(
    page.getByRole("button", { name: /^Sur cet appareil/ }),
  ).toBeDisabled();
  await page.getByRole("switch", { name: "Activer mon rappel" }).click();
  await page
    .getByRole("button", { name: "Enregistrer les horaires", exact: true })
    .click();
  await expect(
    page.getByText("Horaires enregistrés.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Aucun envoi actif" }),
  ).toBeVisible();
  await expect(page.locator(".occurrence")).toHaveCount(0);
  expect(
    (await (await page.request.get("/api/account")).json()).reminder.enabled,
  ).toBe(false);
  await screenshot(page, "rappels", info.project.name);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("clavier simulé : navigation masquante retirée, erreur et action accessibles", async ({
  page,
}) => {
  await setup(page);
  await page.goto("/#measure");
  await page.evaluate(() => {
    const viewport = window.visualViewport!;
    Object.defineProperty(viewport, "height", {
      configurable: true,
      value: innerHeight - 320,
    });
    viewport.dispatchEvent(new Event("resize"));
  });
  await page.getByLabel("Poids", { exact: true }).fill("incorrect");
  await expect(page.locator(".bottom-nav")).toBeHidden();
  await expect(page.locator(".action-bar")).toHaveCSS("position", "static");
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "nombre strictement positif",
  );
  await expect(
    page.getByRole("button", { name: "Réessayer l’enregistrement" }),
  ).toBeVisible();
  const alert = await page.getByRole("alert").boundingBox();
  expect(alert!.y).toBeGreaterThanOrEqual(0);
  expect(alert!.y + alert!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
});

test("rappels : consentement, autorisation refusée et activation confirmée (appareil simulé)", async ({
  page,
}) => {
  await setup(page);
  await page.addInitScript(() => {
    const state = {
      permission: "default",
      requested: 0,
      choice: "denied",
      subscription: null as any,
    };
    (window as any).testNotifications = state;
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: {
        get permission() {
          return state.permission;
        },
        requestPermission: async () => {
          state.requested++;
          state.permission = state.choice;
          return state.choice;
        },
      },
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: class {},
    });
    const registration = {
      pushManager: {
        getSubscription: async () => state.subscription,
        subscribe: async () => {
          state.subscription = {
            endpoint: "https://push.example.test/test",
            toJSON: () => ({
              endpoint: "https://push.example.test/test",
              keys: { p256dh: "test", auth: "test" },
            }),
          };
          return state.subscription;
        },
      },
    };
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        ready: Promise.resolve(registration),
        register: async () => registration,
      },
    });
  });
  await page.route("**/api/config", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      json: { ...(await response.json()), pushConfigured: true },
    });
  });
  await page.route("**/api/push-key", (route) =>
    route.fulfill({ json: { key: "BA".repeat(44) } }),
  );
  await page.route("**/api/subscriptions", (route) =>
    route.fulfill({ json: {} }),
  );
  await page.route("**/api/device-status", (route) =>
    route.fulfill({ json: { active: true } }),
  );
  await page.route("**/api/reminder", (route) =>
    route.fulfill({
      json: {
        ...route.request().postDataJSON(),
        anchor: localDate("Europe/Paris"),
      },
    }),
  );
  await page.goto("/#reminder");
  await expect(
    page.getByRole("button", {
      name: "Autoriser les notifications",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Autoriser les notifications", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Notifications bloquées", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "n’ont pas été autorisées",
  );
  expect(
    await page.evaluate(() => (window as any).testNotifications.requested),
  ).toBe(1);
  expect(
    (await (await page.request.get("/api/account")).json()).consents.push,
  ).toBe(false);
  // Simulate the browser setting being changed, then reopen the screen.
  await page.evaluate(() => {
    (window as any).testNotifications.permission = "default";
    (window as any).testNotifications.choice = "granted";
  });
  await page.getByRole("button", { name: "Mesures", exact: true }).click();
  await page.getByRole("button", { name: "Régler mon rappel" }).click();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Autoriser les notifications", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Notifications disponibles sur cet appareil",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Aucun envoi actif", exact: true }),
  ).toBeVisible();
  await page.getByRole("switch", { name: "Activer mon rappel" }).click();
  await page
    .getByRole("button", { name: "Confirmer le rappel", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Rappel actif", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Notifications actives sur cet appareil.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".occurrence")).toHaveCount(3);
  await page.getByRole("switch", { name: "Activer mon rappel" }).click();
  await page
    .getByRole("button", { name: "Enregistrer le rappel", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Aucun envoi actif", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".occurrence")).toHaveCount(0);
});

test("note seule, période vide et note conservée dans le brouillon", async ({
  page,
}) => {
  const headers = await setup(page);
  const today = localDate("Europe/Paris");
  for (const entry of [
    { date: today, values: {}, note: "Entrée sans valeur chiffrée" },
    { date: shiftDate(today, -450), values: { weight: 79.2 }, note: "" },
  ]) {
    const result = await page.request.post("/api/entries", {
      headers,
      data: { ...entry, height: 175, requestId: crypto.randomUUID() },
    });
    expect(result.ok()).toBe(true);
  }
  await page.goto("/#analysis");
  await expect(page.locator(".graph-value")).toContainText("79,2");
  await expect(page.locator(".graph-caption")).toContainText("hors période");
  await expect(page.locator(".chart,.projection-card")).toHaveCount(0);
  await expect(
    page.getByText(/Aucune valeur sur la période choisie/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Photos de comparaison/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Mesures", exact: true }).click();
  await page.getByText("Ajouter une note", { exact: false }).click();
  await page.getByLabel("Note de cette entrée").fill("Note du jour");
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await page.goBack();
  await expect(page.getByLabel("Note de cette entrée")).toHaveValue(
    "Note du jour",
  );
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mesure enregistrée", exact: true }),
  ).toBeVisible();
  const entries = (await (await page.request.get("/api/account")).json())
    .entries;
  expect(entries).toHaveLength(3);
  expect(
    entries.find((entry: any) => entry.note === "Note du jour").values,
  ).toEqual({});
});

test("un rappel actif sur un autre appareil est conservé", async ({ page }) => {
  const account = emptyAccountData();
  account.profile.onboardingCompleted = true;
  account.consents.body = true;
  account.consents.push = true;
  account.devices = 1;
  account.reminder = {
    enabled: true,
    weekday: 1,
    weekdays: [1],
    frequency: "week",
    time: "08:00",
    timezone: "Europe/Paris",
    anchor: localDate("Europe/Paris"),
    channel: "push",
  };
  await page.route("**/api/auth/get-session**", (route) =>
    route.fulfill({
      json: {
        session: {
          id: "test-session",
          userId: "test-user",
          expiresAt: "2099-01-01T00:00:00Z",
        },
        user: {
          id: "test-user",
          email: "test@example.test",
          name: "Test",
          emailVerified: false,
        },
      },
    }),
  );
  await page.addInitScript(() => {
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: { permission: "denied" },
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: class {},
    });
  });
  await page.route("**/api/config", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      json: { ...(await response.json()), pushConfigured: true },
    });
  });
  await page.route("**/api/account", (route) =>
    route.fulfill({ json: account }),
  );
  let enabled: boolean | undefined;
  await page.route("**/api/reminder", async (route) => {
    const input = route.request().postDataJSON();
    enabled = input.enabled;
    await route.fulfill({
      json: { ...input, anchor: localDate("Europe/Paris") },
    });
  });
  await page.goto("/#reminder");
  await expect(
    page.getByText("Notifications inactives sur cet appareil.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Horaires enregistrés", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".occurrence")).toHaveCount(0);
  await page.getByRole("button", { name: "Mercredi", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirmer le rappel", exact: true })
    .click();
  await expect.poll(() => enabled).toBe(true);
});

test("favoris : glisser-déposer à la souris, au doigt et au clavier, ordre sauvegardé", async ({
  page,
}, info) => {
  await setup(page);
  await page.goto("/#favorites");
  const rows = page
    .getByRole("list", { name: "Ordre des mesures favorites" })
    .getByRole("listitem");
  const names = () => rows.locator("strong").allTextContents();
  const original = await names();
  expect(original.length).toBeGreaterThanOrEqual(3);
  await expect(
    page.getByRole("button", { name: /^(Monter|Descendre) / }),
  ).toHaveCount(0);
  const first = page.getByRole("button", {
    name: `Déplacer ${original[0]}`,
    exact: true,
  });
  await first.scrollIntoViewIfNeeded();
  const start = (await first.boundingBox())!;
  const target = (await rows.nth(2).boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    start.x + start.width / 2,
    target.y + target.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  const moved = [original[1], original[2], original[0], ...original.slice(3)];
  await expect.poll(names).toEqual(moved);
  await expect(page.locator(".favorite-drag-preview")).toHaveCount(0);

  // Touch generates real pointer events, including capture and cancellation.
  const touch = await page.context().newCDPSession(page);
  await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  const handle = (await first.boundingBox())!;
  const destination = (await rows.nth(0).boundingBox())!;
  const x = handle.x + handle.width / 2;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: handle.y + handle.height / 2 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: destination.y + destination.height / 2 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect.poll(names).toEqual(original);
  const cancelStart = (await first.boundingBox())!;
  const cancelTarget = (await rows.nth(1).boundingBox())!;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: cancelStart.y + cancelStart.height / 2 }],
  });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: cancelTarget.y + cancelTarget.height / 2 }],
  });
  await expect.poll(names).not.toEqual(original);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await expect.poll(names).toEqual(original);
  await touch.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await touch.detach();

  await first.focus();
  await first.press("Space");
  await first.press("ArrowDown");
  await first.press("Escape");
  await expect.poll(names).toEqual(original);
  await first.press("Space");
  await first.press("ArrowDown");
  await first.press("Enter");
  const finalOrder = [original[1], original[0], ...original.slice(2)];
  await expect.poll(names).toEqual(finalOrder);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await screenshot(page, "favoris-glisser-deposer", info.project.name, false);
  await page.getByRole("button", { name: "Enregistrer mes favoris" }).click();
  await expect(
    page.getByRole("heading", { name: "Nouvelle mesure", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect
    .poll(() =>
      page
        .locator(".measurement-grid")
        .first()
        .locator("label")
        .allTextContents(),
    )
    .toEqual(finalOrder);
  const history = await page
    .getByRole("button", { name: "Historique des mesures", exact: true })
    .boundingBox();
  const lastFormElement = await page.locator(".privacy-caption").boundingBox();
  expect(history!.y).toBeGreaterThan(
    lastFormElement!.y + lastFormElement!.height,
  );
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await page.goto("/#privacy");
  await expect(page.getByText("Photos privées", { exact: true })).toHaveCount(
    0,
  );
  await page.getByLabel("Format d’export").selectOption("zip");
  await expect(page.getByLabel("Inclure mes photos privées")).toHaveCount(0);
});

test("analyse : plusieurs courbes, indicateurs visibles et périodes à partir de trois mois", async ({
  page,
}, info) => {
  const headers = await setup(page);
  const today = localDate("Europe/Paris");
  for (let i = 0; i < 3; i++) {
    const response = await page.request.post("/api/entries", {
      headers,
      data: {
        date: shiftDate(today, -60 + i * 30),
        values: {
          weight: 80 - i,
          waist: 90 - i,
          ...(i === 1 ? {} : { hips: 100 - i }),
        },
        height: 175,
        note: "",
        requestId: crypto.randomUUID(),
      },
    });
    expect(response.ok()).toBe(true);
  }
  await page.goto("/#analysis");
  const choices = page.getByRole("group", { name: "Mesures du graphique" });
  await expect(
    choices.getByRole("button", { name: "Poids", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".period-selector button")).toHaveText([
    "3M",
    "6M",
    "1A",
    "MAX",
  ]);
  await expect(
    page.getByRole("button", { name: "1M", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Les autres mesures", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".analysis-indicators")).toBeVisible();
  expect(
    await page
      .locator(".analysis-indicators")
      .evaluate(
        (el) =>
          !el.closest("details") &&
          el.previousElementSibling?.classList.contains("graph-card"),
      ),
  ).toBe(true);
  await expect(page.locator(".indicator-detail")).toHaveCount(3);
  await expect(page.locator(".indicator-detail").first()).toContainText(
    "25,5 kg/m²",
  );
  await expect(page.locator(".bmi-zone-label")).toHaveText(
    "Surpoids · 25 à < 30",
  );
  await expect(page.locator(".bmi-zone-scale .is-current")).toHaveClass(
    /bmi-tone-high/,
  );
  await expect(page.locator(".indicator-explanation")).toHaveCount(3);
  await expect(
    page.getByText("Derniers indicateurs de la période sélectionnée."),
  ).toHaveCount(0);
  await expect(
    page.getByText(/Chaque calcul utilise les valeurs d’une même entrée/),
  ).toHaveCount(0);
  await choices
    .getByRole("button", { name: "Tour de taille", exact: true })
    .click();
  await choices.getByRole("button", { name: "Hanches", exact: true }).click();
  await expect(
    page.locator(".comparison-chart [data-series] .chart-line"),
  ).toHaveCount(3);
  await expect(
    page.getByRole("list", { name: "Mesures affichées" }).getByRole("listitem"),
  ).toHaveCount(3);
  await page
    .locator(".comparison-chart")
    .getByRole("button", { name: new RegExp(`^${today} :`) })
    .press("Enter");
  const reading = page.locator(".comparison-point-label");
  await expect(reading).toContainText("78,0 kg");
  await expect(reading).toContainText("88,0 cm");
  await expect(reading).toContainText("98,0 cm");
  await page
    .locator(".comparison-chart")
    .getByRole("button", { name: new RegExp(`^${shiftDate(today, -30)} :`) })
    .press("Enter");
  await expect(reading).toContainText("Non renseigné");
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
  await screenshot(page, "analyse-plusieurs-mesures", info.project.name);
  await page.getByRole("button", { name: "6M", exact: true }).click();
  await page.getByRole("button", { name: /^Comparer deux périodes/ }).click();
  await page
    .getByRole("heading", { name: "Comparer deux périodes", exact: true })
    .waitFor();
  await page.goBack();
  for (const name of ["Poids", "Tour de taille", "Hanches"])
    await expect(
      choices.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "6M", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await choices.getByRole("button", { name: "Poids", exact: true }).click();
  await choices.getByRole("button", { name: "Hanches", exact: true }).click();
  await expect(page.locator(".comparison-chart")).toHaveCount(0);
  await expect(page.locator(".graph-value")).toContainText("88,0");
  await choices
    .getByRole("button", { name: "Tour de taille", exact: true })
    .click();
  await expect(
    choices.getByRole("button", { name: "Tour de taille", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
