import { chromium, expect } from "@playwright/test";
import Fastify from "fastify";
import staticFiles from "@fastify/static";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
const manifest = JSON.parse(readFileSync("dist/manifest.webmanifest", "utf8"));
const base = manifest.scope;
assert.equal(base, "/mesura/");
assert.equal(manifest.start_url, "/mesura/#measure");
assert.match(
  readFileSync("dist/index.html", "utf8"),
  /\/mesura\/assets\/.*\.js/,
);
const server = Fastify();
await server.register(staticFiles, { root: resolve("dist"), prefix: base });
await server.listen({ host: "127.0.0.1", port: 4177 });
const browser = await chromium.launch();
mkdirSync(".runtime", { recursive: true });
try {
  for (const width of [390, 360]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      locale: "fr-FR",
    });
    const page = await context.newPage();
    const errors: string[] = [];
    const missing: string[] = [];
    const requests: string[] = [];
    page.on("request", (r) => requests.push(r.url()));
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().startsWith("http://127.0.0.1") && r.status() >= 400)
        missing.push(r.url());
    });
    // The test checks static hosting paths; cloud rules are checked separately.
    await page.route("**/functions/v1/mesura-api/config", (r) =>
      r.fulfill({
        json: {
          pushConfigured: false,
          emailConfigured: false,
          development: false,
          privacyContact: null,
        },
      }),
    );
    await page.goto(`http://127.0.0.1:4177${base}`);
    await page.getByLabel("Adresse email", { exact: true }).waitFor();
    await page.waitForFunction(() => !document.getElementById("root")?.inert);
    assert.equal(
      requests.some((url) => url.includes("supabase.co")),
      false,
    );
    const assets = requests.filter((url) => url.includes("/assets/"));
    assert.equal(
      assets.some((url) =>
        /PrivateScreens|Measure-|Analysis-|Reminder-|Onboarding|tool-schemas|luxon/.test(
          url,
        ),
      ),
      false,
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .locator("input[autocomplete=nickname]")
        .evaluate((node) => node === document.activeElement),
      true,
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .getByLabel("Adresse email", { exact: true })
        .evaluate((node) => node === document.activeElement),
      true,
    );
    await page
      .getByRole("button", { name: "conditions d’utilisation", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "En toute transparence", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Revenir", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Votre espace à vous.", exact: true }),
    ).toBeVisible();
    assert.equal(await page.getByRole("navigation").count(), 0);
    assert.equal(await page.getByLabel("Poids", { exact: true }).count(), 0);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    for (const route of [
      "analysis",
      "measure",
      "privacy",
      "history",
      "reminder",
    ]) {
      await page.goto(`http://127.0.0.1:4177${base}#${route}`);
      await page.getByLabel("Adresse email", { exact: true }).waitFor();
      assert.equal(await page.getByRole("navigation").count(), 0);
      assert.equal(await page.locator(".graph-card,.demo-banner").count(), 0);
    }
    await page
      .getByRole("button", { name: "Déjà un compte ? Me connecter" })
      .click();
    await page
      .getByRole("button", { name: "Me connecter", exact: true })
      .waitFor();
    await page.reload();
    await page.getByLabel("Adresse email", { exact: true }).waitFor();
    const scope = await page.evaluate(
      async () => (await navigator.serviceWorker.ready).scope,
    );
    assert.equal(new URL(scope).pathname, base);
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    await page.screenshot({
      path: `.runtime/pages-${width}.png`,
      fullPage: true,
    });
    await context.close();
  }
  console.log(
    "Publication /mesura/ vérifiée à 390 et 360 px : connexion obligatoire, liens directs protégés, recharge, assets et PWA.",
  );
} finally {
  await browser.close();
  await server.close();
}
