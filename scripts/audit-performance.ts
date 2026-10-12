import { chromium, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const url = args[0] || "http://127.0.0.1:4180/mesura/";
const directory = resolve(args[1] || ".runtime/performance/final");
const runs = Number(args[2] || 3);
const modes = (args[3] || "mobile,desktop").split(",");
if (modes.some((mode) => !["mobile", "desktop"].includes(mode)))
  throw new Error("Format invalide : mobile ou desktop.");
if (!Number.isInteger(runs) || runs < 1)
  throw new Error("Nombre de mesures invalide.");
await mkdir(directory, { recursive: true });
const execute = promisify(execFile);
const categories = ["performance", "accessibility", "best-practices", "seo"];
const metrics = [
  "first-contentful-paint",
  "largest-contentful-paint",
  "speed-index",
  "total-blocking-time",
  "cumulative-layout-shift",
];
const results: any[] = [];
for (const mode of modes) {
  // Verify an actual interactive form, separately from the visual lab metrics.
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport:
        mode === "mobile"
          ? { width: 390, height: 844 }
          : { width: 1350, height: 940 },
      serviceWorkers: "block",
      locale: "fr-FR",
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    await expect(
      page.getByRole("heading", { name: "Votre espace à vous.", exact: true }),
    ).toBeVisible();
    await expect(page.locator("#root")).not.toHaveAttribute("inert", "");
    await expect(
      page.getByRole("button", { name: "Créer mon espace", exact: true }),
    ).toBeEnabled();
    await page.screenshot({
      path: resolve(directory, `${mode}-usable.png`),
      fullPage: true,
    });
    await page
      .getByLabel("Adresse email", { exact: true })
      .fill("audit@example.test");
    await page.getByLabel("Mot de passe", { exact: true }).fill("Audit!2026");
    await page
      .getByRole("button", { name: "Afficher le mot de passe", exact: true })
      .click();
    await expect(
      page.getByLabel("Mot de passe", { exact: true }),
    ).toHaveAttribute("type", "text");
    await page
      .getByRole("button", {
        name: "Déjà un compte ? Me connecter",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Content de vous revoir.",
        exact: true,
      }),
    ).toBeVisible();
    expect(errors).toEqual([]);
    await writeFile(
      resolve(directory, `${mode}-usable.json`),
      JSON.stringify(
        {
          url,
          errors,
          hydrationMarks: await page.evaluate(() =>
            performance
              .getEntriesByName("mesura:interactive")
              .map((entry) => entry.startTime),
          ),
        },
        null,
        2,
      ),
    );
    if (mode === "mobile") {
      const slow = await browser.newPage({
        viewport: { width: 390, height: 844 },
        serviceWorkers: "block",
      });
      const cdp = await slow.context().newCDPSession(slow);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: (1600 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await slow.goto(url);
      await expect(slow.locator("#root")).not.toHaveAttribute("inert", "");
      await slow
        .getByLabel("Adresse email", { exact: true })
        .fill("slow@example.test");
      await slow
        .getByRole("button", {
          name: "Déjà un compte ? Me connecter",
          exact: true,
        })
        .click();
      await expect(
        slow.getByRole("heading", {
          name: "Content de vous revoir.",
          exact: true,
        }),
      ).toBeVisible();
      await writeFile(
        resolve(directory, "mobile-throttled-usable.json"),
        JSON.stringify(
          {
            description:
              "Réseau CDP 1,6 Mbit/s, latence 150 ms, CPU ×4 ; mesure observée distincte de la simulation Lighthouse.",
            marks: await slow.evaluate(() =>
              performance.getEntriesByType("mark").map((entry) => ({
                name: entry.name,
                startTime: entry.startTime,
              })),
            ),
            paints: await slow.evaluate(() =>
              performance.getEntriesByType("paint").map((entry) => ({
                name: entry.name,
                startTime: entry.startTime,
              })),
            ),
          },
          null,
          2,
        ),
      );
      await slow.close();
    }
  } finally {
    await browser.close();
  }
  for (let run = 1; run <= runs; run++) {
    const prefix = resolve(directory, `${mode}-${run}`);
    await execute(
      process.execPath,
      [
        resolve("node_modules/lighthouse/cli/index.js"),
        url,
        "--chrome-flags=--headless --no-sandbox",
        "--quiet",
        `--only-categories=${categories.join(",")}`,
        "--output=json",
        "--output=html",
        `--output-path=${prefix}`,
        ...(mode === "desktop" ? ["--preset=desktop"] : []),
      ],
      {
        env: { ...process.env, CHROME_PATH: chromium.executablePath() },
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    const report = JSON.parse(await readFile(`${prefix}.report.json`, "utf8"));
    if (report.runtimeError)
      throw new Error(JSON.stringify(report.runtimeError));
    const interactive = report.audits["user-timings"].details.items.find(
      (item: { name: string }) => item.name === "mesura:interactive",
    );
    if (!interactive)
      throw new Error("Lighthouse n’a pas observé l’hydratation de Mesura.");
    const lcp = report.audits["lcp-breakdown-insight"].details.items.find(
      (item: { type: string }) => item.type === "node",
    );
    if (!lcp?.nodeLabel?.includes("VOTRE ESPACE À VOUS"))
      throw new Error("Lighthouse n’a pas mesuré l’écran de compte attendu.");
    const result = {
      mode,
      run,
      url: report.finalDisplayedUrl,
      fetchTime: report.fetchTime,
      lighthouseVersion: report.lighthouseVersion,
      observedInteractiveMs: interactive.startTime,
      lcpElement: lcp.nodeLabel,
      scores: Object.fromEntries(
        categories.map((name) => [
          name,
          Math.round(report.categories[name].score * 100),
        ]),
      ),
      metrics: Object.fromEntries(
        metrics.map((name) => [name, report.audits[name].numericValue]),
      ),
      warnings: report.runWarnings,
      report: `${prefix}.report.html`,
    };
    results.push(result);
    console.log(JSON.stringify(result));
    await writeFile(
      resolve(directory, "runs.json"),
      JSON.stringify(results, null, 2),
    );
  }
}
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b),
    middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
const summary = Object.fromEntries(
  modes.map((mode) => {
    const measured = results.filter((result) => result.mode === mode);
    return [
      mode,
      Object.fromEntries(
        [...categories, ...metrics].map((name) => {
          const values = measured.map(
            (result) => result.scores[name] ?? result.metrics[name],
          );
          return [
            name,
            {
              minimum: Math.min(...values),
              median: median(values),
              maximum: Math.max(...values),
            },
          ];
        }),
      ),
    ];
  }),
);
await writeFile(
  resolve(directory, "summary.json"),
  JSON.stringify(summary, null, 2),
);
console.log(JSON.stringify(summary, null, 2));
