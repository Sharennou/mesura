import { test, expect, type Page } from "./fixtures";
import AxeBuilder from "@axe-core/playwright";

async function checkLayout(page: Page) {
  for (const width of [320, 360, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const layout = await page
      .locator(".onboarding-screen")
      .evaluate((section) => {
        const bounds = section.getBoundingClientRect();
        const controls = [...section.querySelectorAll("input, select, button")];
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          controlsFit: controls.every((control) => {
            const rect = control.getBoundingClientRect();
            const minimumHeight = ["checkbox", "radio"].includes(
              control.getAttribute("type") ?? "",
            )
              ? 22
              : control.tagName === "BUTTON"
                ? 44
                : 52;
            return (
              rect.left >= bounds.left &&
              rect.right <= bounds.right + 1 &&
              rect.height >= minimumHeight - 0.01
            );
          }),
        };
      });
    expect(layout.overflow, `${width}px`).toBe(false);
    expect(layout.controlsFit, `${width}px`).toBe(true);
  }
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
}

async function signup(page: Page) {
  const password = "ResponsiveMesura!2026";
  const response = await page.request.post("/api/auth/sign-up/email", {
    headers: { Origin: "http://127.0.0.1:5181", "x-requested-with": "Mesura" },
    data: {
      name: "Test responsive",
      email: `responsive-${crypto.randomUUID()}@example.test`,
      password,
    },
  });
  expect(response.ok()).toBe(true);
  await page.goto("/#measure");
  await expect(
    page.getByRole("heading", { name: "Quelle est votre taille ?" }),
  ).toBeVisible();
  return password;
}

async function removeAccount(page: Page, password: string) {
  await page.request.delete("/api/account", {
    headers: { Origin: "http://127.0.0.1:5181", "x-requested-with": "Mesura" },
    data: { password },
  });
}

test("inscription : une question à la fois, cible sauvegardée et affichage de 320 px à la tablette", async ({
  page,
}, info) => {
  const password = await signup(page);
  const next = () =>
    page.getByRole("button", { name: "Continuer", exact: true }).click();
  const previous = () =>
    page.getByRole("button", { name: "Question précédente" }).click();
  await expect(
    page.getByRole("button", { name: "Question précédente" }),
  ).toHaveCount(0);
  await expect(page.locator("form input, form select")).toHaveCount(1);
  await page.getByLabel("Votre hauteur en cm").fill("175,5");
  await checkLayout(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `test-results/${info.project.name}-onboarding-height.png`,
    fullPage: true,
  });
  await page.getByLabel("Votre hauteur en cm").press("Enter");
  await expect(
    page.getByRole("heading", { name: "Quand êtes-vous né·e ?" }),
  ).toBeFocused();
  await page.getByLabel("Date de naissance").fill("1996-01-01");
  await checkLayout(page);
  await next();
  await page
    .getByRole("radio", { name: "Je préfère ne pas répondre", exact: true })
    .check();
  await checkLayout(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `test-results/${info.project.name}-onboarding-sex.png`,
    fullPage: true,
  });
  await next();
  await page
    .getByRole("radio", { name: "Viser ou maintenir une cible", exact: true })
    .check();
  await checkLayout(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: `test-results/${info.project.name}-onboarding-goal.png`,
    fullPage: true,
  });
  await next();
  await expect(page.getByLabel("Mesure de mon objectif")).toHaveValue("weight");
  await checkLayout(page);
  await next();
  await expect(page.getByLabel("Ma cible (kg)")).toHaveCount(0);
  await page.getByLabel("Mon départ (kg)").fill("80");
  await checkLayout(page);
  await next();
  await expect(page.getByLabel("Mon départ (kg)")).toHaveCount(0);
  await page.getByLabel("Ma cible (kg)").fill("75");
  await checkLayout(page);
  await next();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "8",
  );
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await previous();
  await expect(page.getByLabel("Ma cible (kg)")).toHaveValue("75");
  await next();
  await page.getByRole("checkbox").check();
  await checkLayout(page);
  const pending = await (await page.request.get("/api/account")).json();
  expect(pending.profile.onboardingCompleted).toBe(false);
  expect(pending.profile.height).toBeNull();
  await page.getByRole("button", { name: "Commencer mon suivi" }).click();
  await expect(
    page.getByRole("heading", { name: "Nouvelle mesure", exact: true }),
  ).toBeVisible();
  const account = await (await page.request.get("/api/account")).json();
  expect(account.profile.height).toBe(175.5);
  expect(account.profile.toolProfile.equation).toBe("unspecified");
  expect(account.goal).toMatchObject({
    measureId: "weight",
    start: 80,
    target: 75,
  });
  await removeAccount(page, password);
});

test("inscription : validation par question, retour et changement vers le suivi sans cible", async ({
  page,
}) => {
  const password = await signup(page);
  const next = () =>
    page.getByRole("button", { name: "Continuer", exact: true }).click();
  const previous = () =>
    page.getByRole("button", { name: "Question précédente" }).click();
  for (const height of ["0", "301", "abc"]) {
    await page.getByLabel("Votre hauteur en cm").fill(height);
    await next();
    await expect(page.getByRole("alert")).toContainText("taille");
    await expect(page.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
  }
  await page.getByLabel("Votre hauteur en cm").fill("172");
  await next();
  await page.getByLabel("Date de naissance").fill("2999-01-01");
  await next();
  await expect(page.getByRole("alert")).toContainText("futur");
  await page.getByLabel("Date de naissance").fill("1996-01-01");
  await next();
  // Native radios support keyboard selection as well as tapping the cards.
  await page.getByRole("radio", { name: "Féminin", exact: true }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("radio", { name: "Masculin", exact: true }),
  ).toBeChecked();
  await next();
  await next();
  await expect(page.getByRole("alert")).toContainText(
    "Choisissez votre objectif",
  );
  await page
    .getByRole("radio", { name: "Viser ou maintenir une cible", exact: true })
    .check();
  await next();
  await page.getByLabel("Mesure de mon objectif").selectOption("waist");
  await next();
  for (const value of ["0", "-5", "100001", "abc"]) {
    await page.getByLabel("Mon départ (cm)").fill(value);
    await next();
    await expect(page.getByRole("alert")).toContainText(
      "valeur supérieure à 0",
    );
  }
  await page.getByLabel("Mon départ (cm)").fill("90");
  await next();
  await page.getByLabel("Ma cible (cm)").fill("85");
  await previous();
  await previous();
  await page.getByLabel("Mesure de mon objectif").selectOption("weight");
  await next();
  await expect(page.getByLabel("Mon départ (kg)")).toHaveValue("");
  await page.getByLabel("Mon départ (kg)").fill("80");
  await next();
  await expect(page.getByLabel("Ma cible (kg)")).toHaveValue("");
  await page.getByLabel("Ma cible (kg)").fill("75");
  await next();
  for (let index = 0; index < 4; index++) await previous();
  await page
    .getByRole("radio", { name: "Suivre mon évolution", exact: true })
    .check();
  await next();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuemax",
    "5",
  );
  await expect(
    page.getByRole("heading", { name: "Prêt·e à commencer ?" }),
  ).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Commencer mon suivi" }).click();
  await expect(
    page.getByRole("heading", { name: "Nouvelle mesure", exact: true }),
  ).toBeVisible();
  const account = await (await page.request.get("/api/account")).json();
  expect(account.goal).toBeNull();
  expect(account.profile.toolProfile).toMatchObject({
    birthDate: "1996-01-01",
    equation: "male",
  });
  await removeAccount(page, password);
});
