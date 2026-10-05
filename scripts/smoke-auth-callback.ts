import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import Fastify from "fastify";
import staticFiles from "@fastify/static";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import {
  emptyCloudAccount,
  mutateCloudAccount,
  publicCloudAccount,
} from "../shared/cloud-domain";

// Contrat du navigateur compilé avec Auth simulé, sans email ou compte externe.
// Les transactions réelles sont contrôlées dans les tests API et cloud.
const server = Fastify();
await server.register(staticFiles, {
  root: resolve("dist"),
  prefix: "/mesura/",
});
await server.listen({ host: "127.0.0.1", port: 4178 });
const browser = await chromium.launch();
const caps = {
  pushConfigured: false,
  emailConfigured: false,
  development: false,
  privacyContact: null,
};
const user = {
  id: crypto.randomUUID(),
  email: "parcours@example.test",
  email_confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  app_metadata: { provider: "email" },
  user_metadata: { name: "Mon espace" },
  aud: "authenticated",
};
const encode = (v: unknown) =>
  Buffer.from(JSON.stringify(v)).toString("base64url");
const access = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })}.test-only`;
try {
  for (const width of [390, 360]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      locale: "fr-FR",
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    let account = emptyCloudAccount("Mon espace", "Europe/Paris");
    let reads = 0;
    await page.route("**/auth/v1/user", (r) => r.fulfill({ json: user }));
    await page.route("**/auth/v1/logout**", (r) => r.fulfill({ status: 204 }));
    await page.route("**/functions/v1/mesura-api/**", async (r) => {
      const path = new URL(r.request().url()).pathname.split("mesura-api")[1];
      if (path === "/config") return r.fulfill({ json: caps });
      assert.equal(r.request().headers().authorization, `Bearer ${access}`);
      if (path === "/account") {
        reads++;
        return r.fulfill({ json: publicCloudAccount(account) });
      }
      if (path === "/onboarding") {
        const changed = mutateCloudAccount(
          account,
          "POST",
          path,
          r.request().postDataJSON(),
          caps,
        );
        account = changed.account;
        return r.fulfill({ json: changed.result });
      }
      return r.fulfill({ status: 404, json: { error: "Ressource inconnue" } });
    });
    // Nouveau navigateur : aucune session et aucun vérificateur PKCE préalables.
    const fragment = new URLSearchParams({
      access_token: access,
      refresh_token: "test-refresh",
      expires_in: "3600",
      token_type: "bearer",
      type: "signup",
    });
    await page.goto(`http://127.0.0.1:4178/mesura/#${fragment}`);
    await expect(
      page.getByRole("heading", {
        name: "Votre point de départ.",
        exact: true,
      }),
    ).toBeVisible();
    assert.ok(reads > 0);
    assert.equal(new URL(page.url()).hash, "");
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await page.getByLabel("Votre hauteur en cm").fill("172");
    await page.getByLabel("Votre objectif").selectOption("target");
    await page.getByLabel("Mon départ").fill("80");
    await page.getByLabel("Ma cible").fill("75");
    await page.getByRole("checkbox").check();
    await page.screenshot({
      path: `.runtime/onboarding-${width}.png`,
      fullPage: true,
    });
    assert.deepEqual(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
      [],
    );
    await page.getByRole("button", { name: "Commencer mon suivi" }).click();
    await expect(
      page.getByRole("heading", { name: "Nouvelle mesure", exact: true }),
    ).toBeVisible();
    assert.equal(account.goal?.target, 75);
    assert.equal(account.profile.height, 172);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Nouvelle mesure", exact: true }),
    ).toBeVisible();
    // La récupération crée aussi une session, mais reste sur le changement de mot de passe.
    await page.goto(
      `http://127.0.0.1:4178/mesura/?reset=1#${new URLSearchParams({ ...Object.fromEntries(fragment), type: "recovery" })}`,
    );
    await expect(
      page.getByRole("heading", { name: "Un nouveau départ.", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("navigation")).toHaveCount(0);
    await context.close();
    const expired = await browser.newPage({
      viewport: { width, height: 844 },
      serviceWorkers: "block",
    });
    await expired.route("**/functions/v1/mesura-api/config", (r) =>
      r.fulfill({ json: caps }),
    );
    await expired.goto(
      "http://127.0.0.1:4178/mesura/#error=access_denied&error_code=otp_expired&error_description=Expired",
    );
    await expect(expired.getByRole("alert")).toContainText(
      "expiré ou invalide",
    );
    await expect(expired.getByRole("navigation")).toHaveCount(0);
    assert.equal(new URL(expired.url()).hash, "#account");
    await expired.close();
  }
  console.log(
    "Confirmation email : session automatique dans un navigateur neuf, démarrage avec cible, reprise, lien expiré et récupération vérifiés à 390 et 360 px (Auth simulé).",
  );
} finally {
  await browser.close();
  await server.close();
}
