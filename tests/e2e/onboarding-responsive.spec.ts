import { test, expect } from "./fixtures";

test("point de départ : champs et objectif utilisables de 320 px à la tablette", async ({
  page,
}, info) => {
  const password = "ResponsiveMesura!2026";
  const signup = await page.request.post("/api/auth/sign-up/email", {
    headers: { Origin: "http://127.0.0.1:5181", "x-requested-with": "Mesura" },
    data: {
      name: "Test responsive",
      email: `responsive-${crypto.randomUUID()}@example.test`,
      password,
    },
  });
  expect(signup.ok()).toBe(true);
  await page.goto("/#measure");
  await expect(
    page.getByRole("heading", { name: "Votre point de départ." }),
  ).toBeVisible();
  await page.getByLabel("Votre hauteur en cm").fill("175,5");
  await page.getByLabel("Date de naissance").fill("1996-01-01");
  await page.getByLabel("Sexe").selectOption("unspecified");
  await page.getByLabel("Votre objectif").selectOption("target");
  await page.getByLabel("Mon départ (kg)").fill("80");
  await page.getByLabel("Ma cible (kg)").fill("75");
  await page.getByRole("checkbox").check();

  for (const width of [320, 360, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    const layout = await page
      .locator(".onboarding-screen")
      .evaluate((section) => {
        const bounds = section.getBoundingClientRect();
        const controls = [...section.querySelectorAll("input, select, button")];
        const start = section
          .querySelector(".two-fields input")!
          .getBoundingClientRect();
        const target = section
          .querySelectorAll(".two-fields input")[1]
          .getBoundingClientRect();
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          controlsFit: controls.every((control) => {
            const rect = control.getBoundingClientRect();
            const minimumHeight =
              control.getAttribute("type") === "checkbox"
                ? 22
                : control.tagName === "BUTTON"
                  ? 44
                  : 52;
            return (
              rect.left >= bounds.left &&
              rect.right <= bounds.right + 1 &&
              rect.height >= minimumHeight
            );
          }),
          stacked: target.top >= start.bottom,
        };
      });
    expect(layout.overflow, `${width}px`).toBe(false);
    expect(layout.controlsFit, `${width}px`).toBe(true);
    expect(layout.stacked, `${width}px`).toBe(width < 375);
    if (width === 320 || width === 390)
      await page.screenshot({
        path: `test-results/${info.project.name}-onboarding-${width}.png`,
        fullPage: true,
      });
  }

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
  await page.request.delete("/api/account", {
    headers: { Origin: "http://127.0.0.1:5181", "x-requested-with": "Mesura" },
    data: { password },
  });
});
