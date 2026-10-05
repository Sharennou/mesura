import { request } from "@playwright/test";
import sharp from "sharp";
import { CONSENT_VERSION } from "../shared/config";
import { localDate, shiftDate } from "../shared/calculations";

const baseURL = process.env.MESURA_PREVIEW_URL ?? "http://127.0.0.1:5182";
if (!["127.0.0.1", "localhost"].includes(new URL(baseURL).hostname))
  throw new Error(
    "Cette préparation est réservée à une prévisualisation locale.",
  );
const password = "ParcoursMesura!2026"; // Identifiant de test local uniquement.
const today = localDate("Europe/Paris");
for (const [name, count] of [
  ["vide", 0],
  ["premiere", 1],
  ["suivi", 6],
] as const) {
  const client = await request.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL, "x-requested-with": "Mesura" },
  });
  if (!(await (await client.get("/api/config")).json()).development)
    throw new Error("Le serveur doit être en développement.");
  const email = `${name}@mesura.example.test`;
  let response = await client.post("/api/auth/sign-up/email", {
    data: { name: `Test · ${name}`, email, password },
  });
  if (!response.ok())
    response = await client.post("/api/auth/sign-in/email", {
      data: { email, password },
    });
  if (!response.ok())
    throw new Error(`Impossible de préparer le compte ${name}`);
  const account = await (await client.get("/api/account")).json();
  if (!account.profile.onboardingCompleted) {
    const result = await client.post("/api/onboarding", {
      data: {
        height: 175,
        consent: true,
        version: CONSENT_VERSION,
        goal: null,
      },
    });
    if (!result.ok()) throw new Error(await result.text());
  }
  if (count && !account.entries.length) {
    if (count > 1)
      await client.post("/api/consents", {
        data: { purpose: "photos", granted: true, version: CONSENT_VERSION },
      });
    for (let i = 0; i < count; i++) {
      const data = JSON.stringify({
        date: shiftDate(today, -50 + i * 10),
        values:
          i === 2
            ? { waist: 84 }
            : {
                weight: 78 + i * 0.2,
                waist: 85 - i * 0.3,
                ...(i % 2 ? { hips: 99 } : {}),
              },
        height: 175,
        note: i === 0 ? "Note de test · reprise du suivi" : "",
        requestId: crypto.randomUUID(),
      });
      const photo =
        count > 1 && [0, 5].includes(i)
          ? await sharp({
              create: {
                width: 240,
                height: 320,
                channels: 3,
                background: i ? "#434FED" : "#D3F653",
              },
            })
              .png()
              .toBuffer()
          : null;
      const result = await client.post(
        "/api/entries",
        photo
          ? {
              multipart: {
                data,
                face: {
                  name: "test.png",
                  mimeType: "image/png",
                  buffer: photo,
                },
              },
            }
          : { data: JSON.parse(data) },
      );
      if (!result.ok()) throw new Error(await result.text());
    }
  }
  console.log(`Compte local prêt : ${email} (${count} entrée(s) prévue(s))`);
  await client.dispose();
}
console.log(
  `Prévisualisation : ${baseURL} · mot de passe des comptes de test : ${password}`,
);
