import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
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

async function screenshot(page: Page, name: string, project: string) {
  await expect(page.locator(".toast")).toHaveCount(0);
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
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

test("historique, analyse et outils : dates, photos et contexte restaurés", async ({
  page,
}, info) => {
  const headers = await setup(page);
  const today = localDate("Europe/Paris");
  await page.request.post("/api/consents", {
    headers,
    data: { purpose: "photos", granted: true, version: CONSENT_VERSION },
  });
  const image = await sharp({
    create: { width: 120, height: 160, channels: 3, background: "#434FED" },
  })
    .png()
    .toBuffer();
  for (let i = 0; i < 8; i++) {
    const entry = {
      date: shiftDate(today, -75 + i * 10),
      values:
        i === 2 ? { waist: 86 } : { weight: 80 + i / 10, waist: 88 - i / 10 },
      note: i === 0 ? "Note ancienne" : "",
      height: 175,
      requestId: crypto.randomUUID(),
    };
    const result = await page.request.post(
      "/api/entries",
      [0, 7].includes(i)
        ? {
            headers,
            multipart: {
              data: JSON.stringify(entry),
              face: { name: "test.png", mimeType: "image/png", buffer: image },
            },
          }
        : { headers, data: entry },
    );
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
    ["Photos de comparaison", "Photos de comparaison"],
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
      title === "Bilan mensuel"
        ? "bilan"
        : title === "Photos de comparaison"
          ? "photos"
          : "comparaison",
      info.project.name,
    );
    if (title === "Photos de comparaison") {
      await expect(page.locator(".photo-side-by-side img")).toHaveCount(2);
      await page.getByRole("button", { name: "Profil", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Ajouter une photo à une entrée" }),
      ).toBeVisible();
    }
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

test("note seule, période vide, photo unique et fichier conservé dans le brouillon", async ({
  page,
}) => {
  const headers = await setup(page);
  const today = localDate("Europe/Paris");
  await page.request.post("/api/entries", {
    headers,
    data: {
      date: today,
      values: {},
      note: "Entrée sans valeur chiffrée",
      height: 175,
      requestId: crypto.randomUUID(),
    },
  });
  await page.request.post("/api/consents", {
    headers,
    data: { purpose: "photos", granted: true, version: CONSENT_VERSION },
  });
  const photo = await sharp({
    create: { width: 120, height: 160, channels: 3, background: "#D3F653" },
  })
    .png()
    .toBuffer();
  const result = await page.request.post("/api/entries", {
    headers,
    multipart: {
      data: JSON.stringify({
        date: shiftDate(today, -450),
        values: { weight: 79.2 },
        note: "",
        height: 175,
        requestId: crypto.randomUUID(),
      }),
      face: { name: "test.png", mimeType: "image/png", buffer: photo },
    },
  });
  expect(result.ok()).toBe(true);
  await page.goto("/#analysis");
  await expect(page.locator(".graph-value")).toContainText("79,2");
  await expect(page.locator(".graph-caption")).toContainText("hors période");
  await expect(page.locator(".chart,.projection-card")).toHaveCount(0);
  await expect(
    page.getByText(/Aucune valeur sur la période choisie/),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Photos de comparaison/ }).click();
  await expect(page.getByText(/Une seule date photographiée/)).toBeVisible();
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Ajouter une photo à une entrée" })
    .click();
  await expect(page.getByLabel("Ajouter une photo de face")).toBeVisible();
  await page.getByLabel("Ajouter une photo de face").setInputFiles({
    name: "nouvelle.png",
    mimeType: "image/png",
    buffer: photo,
  });
  await page.getByRole("button", { name: "Analyse", exact: true }).click();
  await page.goBack();
  await expect(
    page.getByText("1 photo ajoutée · modifier", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Enregistrer la mesure", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mesure enregistrée", exact: true }),
  ).toBeVisible();
  const entries = (await (await page.request.get("/api/account")).json())
    .entries;
  expect(entries).toHaveLength(3);
  const saved = entries.find(
    (entry: any) => entry.note === "" && entry.date === today,
  );
  expect(saved.values).toEqual({});
  expect(saved.photos).toHaveLength(1);
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
