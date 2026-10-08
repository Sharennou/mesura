import { createClient } from "@supabase/supabase-js";
import { request } from "@playwright/test";
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { CONSENT_VERSION } from "../shared/config";
import { SUPABASE_PUBLIC_KEY, SUPABASE_URL } from "../shared/cloud-config";
import { localDate, shiftDate } from "../shared/calculations";
import type { AccountData, Entry } from "../shared/types";
import {
  newToolContext,
  entryTools,
  type ToolProfile,
} from "../shared/body-tools";

const { values: options } = parseArgs({
  options: {
    target: { type: "string", default: "local" },
    url: { type: "string", default: "http://127.0.0.1:5173" },
    email: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});
if (!["local", "cloud"].includes(options.target!))
  throw new Error("Choisissez --target local ou cloud.");
const target = options.target!;
const credentialsPath = resolve(
  ".runtime",
  `development-account-${target}.json`,
);
const credentials = existsSync(credentialsPath)
  ? JSON.parse(readFileSync(credentialsPath, "utf8"))
  : {
      email: options.email ?? "developpement@mesura.example.com",
      password: `Mesura!${randomBytes(12).toString("base64url")}`,
      anchorDate: localDate("Europe/Paris"),
    };
if (options.email && options.email !== credentials.email)
  throw new Error(
    "Un compte de développement est déjà enregistré pour cette cible dans .runtime.",
  );
const name = "Développement · données fictives";
const toolProfile: ToolProfile = { birthDate: "1990-01-01", equation: "male" };
type SeedEntry = Pick<
  Entry,
  "date" | "values" | "height" | "note" | "tools"
> & {
  requestId: string;
};
const round = (value: number) => Math.round(value * 10) / 10;
function requestId(index: number) {
  const hash = createHash("sha256")
    .update(
      `mesura-development-v1:${credentials.email}:${credentials.anchorDate}:${index}`,
    )
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
const entries: SeedEntry[] = Array.from({ length: 28 }, (_, i) => {
  const progress = i / 27;
  const wobble = Math.sin(i * 1.7);
  const values: Record<string, number> = {
    weight: round(83.6 - 7.2 * progress + wobble * 0.35),
    waist: round(94 - 9 * progress + wobble * 0.5),
    hips: round(103 - 5 * progress + wobble * 0.3),
    chest: round(104 - 3 * progress + wobble * 0.4),
    neck: round(39 - progress + wobble * 0.1),
    shoulders: round(115 + progress + wobble * 0.4),
    abdomen: round(98 - 10 * progress + wobble * 0.6),
    "biceps-left": round(32 + 1.6 * progress + wobble * 0.2),
    "biceps-right": round(32.4 + 1.6 * progress + wobble * 0.2),
    "forearm-left": round(27 + 0.7 * progress + wobble * 0.1),
    "forearm-right": round(27.2 + 0.7 * progress + wobble * 0.1),
    "thigh-left": round(60 - 3 * progress + wobble * 0.3),
    "thigh-right": round(60.5 - 3 * progress + wobble * 0.3),
    "calf-left": round(38 + 0.4 * progress + wobble * 0.1),
    "calf-right": round(38.3 + 0.4 * progress + wobble * 0.1),
  };
  // A few partial sessions exercise missing values without adding zeroes.
  if ([8, 17].includes(i)) delete values.weight;
  if ([5, 14, 23].includes(i))
    for (const id of Object.keys(values))
      if (!["weight", "waist", "hips"].includes(id)) delete values[id];
  const notes = [
    "Début du suivi fictif.",
    "Séance de renforcement · ressenti positif.",
    "Semaine chargée · mesure rapide.",
    "Retour à une routine régulière.",
    "Mesure après une semaine de repos.",
    "Bilan de progression fictif.",
  ];
  return {
    date: shiftDate(credentials.anchorDate, -14 * (27 - i)),
    values,
    height: 175,
    note:
      i % 4 === 0 || i === 27
        ? `[Données fictives] ${notes[Math.floor(i / 4) % notes.length]}`
        : "",
    requestId: requestId(i),
  };
});
entries.push({
  date: shiftDate(credentials.anchorDate, -3),
  values: {},
  height: 175,
  note: "[Données fictives] Note seule : énergie et récupération.",
  requestId: requestId(28),
});
entries.push({
  date: credentials.anchorDate,
  values: { weight: round(entries[27].values.weight + 0.2) },
  height: 175,
  note: "[Données fictives] Seconde mesure le même jour pour tester la moyenne.",
  requestId: requestId(29),
});
// Separate, explicitly synthetic sessions: do not relabel legacy protocols.
for (const index of [26, 27]) {
  const sample = entries[index];
  entries.push({
    ...sample,
    values: { ...sample.values, "waist-rfm": round(sample.values.waist + 1.5) },
    note: "[Données fictives] Séance complète pour les outils : adulte fictif, équation masculine, protocoles NICE et RFM distincts.",
    tools: {
      ...newToolContext(toolProfile),
      waistProtocol: "nice-midpoint",
      rfmWaistProtocol: "iliac-crest",
      heightDate: sample.date,
      heightOrigin: "session",
    },
    requestId: requestId(index + 4),
  });
}
function matchesEntry(stored: Entry, entry: (typeof entries)[number]) {
  return (
    stored.date === entry.date &&
    stored.note === entry.note &&
    stored.height === entry.height &&
    (!entry.tools ||
      Object.entries(entry.tools).every(
        ([key, value]) =>
          stored.tools?.[key as keyof NonNullable<Entry["tools"]>] === value,
      )) &&
    Object.keys(stored.values).length === Object.keys(entry.values).length &&
    Object.entries(entry.values).every(
      ([id, value]) => stored.values[id] === value,
    )
  );
}
const summary = {
  entries: entries.length,
  measurements: entries.reduce(
    (count, entry) => count + Object.keys(entry.values).length,
    0,
  ),
  from: entries[0].date,
  to: credentials.anchorDate,
};
if (options["dry-run"]) {
  console.log(JSON.stringify(summary));
  process.exit(0);
}
mkdirSync(resolve(".runtime"), { recursive: true });
// Private local file makes retries reuse the same account and idempotency keys.
writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + "\n", {
  mode: 0o600,
});
let api: <T>(path: string, method?: string, body?: unknown) => Promise<T>;
let dispose: () => Promise<void>;
if (target === "cloud") {
  const cloud = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let signed: Awaited<ReturnType<typeof cloud.auth.signUp>> =
    await cloud.auth.signInWithPassword(credentials);
  if (signed.error?.code === "invalid_credentials")
    signed = await cloud.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: { data: { name } },
    });
  if (signed.error)
    throw new Error(`Authentification : ${signed.error.message}`);
  if (!signed.data.session)
    throw new Error(
      "Ce compte nécessite une confirmation par email avant de pouvoir être rempli.",
    );
  const token = signed.data.session.access_token;
  api = async <T>(path: string, method = "GET", body?: unknown) => {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/mesura-api${path}`,
      {
        method,
        headers: {
          apikey: SUPABASE_PUBLIC_KEY,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Requested-With": "Mesura",
          "X-Timezone": "Europe/Paris",
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    const result = await response.json();
    if (!response.ok)
      throw new Error(`API ${response.status} : ${result.error ?? "échec"}`);
    return result as T;
  };
  dispose = async () => {
    await cloud.auth.signOut({ scope: "local" });
  };
} else {
  const url = options.url!;
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw new Error("La cible locale doit utiliser localhost ou 127.0.0.1.");
  const client = await request.newContext({
    baseURL: url,
    extraHTTPHeaders: { Origin: url, "x-requested-with": "Mesura" },
  });
  api = async <T>(path: string, method = "GET", body?: unknown) => {
    const response = await client.fetch(`/api${path}`, {
      method,
      ...(body === undefined ? {} : { data: body }),
    });
    const result = await response.json();
    if (!response.ok())
      throw new Error(
        `API ${response.status()} : ${result.error?.message ?? result.error ?? "échec"}`,
      );
    return result as T;
  };
  if (!(await api<{ development: boolean }>("/config")).development)
    throw new Error("Le serveur local doit être en développement.");
  const login = await client.post("/api/auth/sign-in/email", {
    data: credentials,
  });
  if (login.status() === 401)
    await api("/auth/sign-up/email", "POST", { ...credentials, name });
  else if (!login.ok())
    throw new Error(`Connexion locale refusée : ${login.status()}`);
  dispose = () => client.dispose();
}
try {
  let account = await api<AccountData>("/account");
  if (account.profile.name !== name)
    throw new Error(
      "Ce compte n’est pas identifié comme un compte de développement fictif.",
    );
  const freshAccount = !account.profile.onboardingCompleted;
  if (freshAccount) {
    account = await api<AccountData>("/onboarding", "POST", {
      height: 175,
      heightDate: entries[0].date,
      toolProfile: {
        ...toolProfile,
        waistProtocol: "nice-midpoint",
        rfmWaistProtocol: "iliac-crest",
      },
      consent: true,
      version: CONSENT_VERSION,
      goal: { measureId: "weight", start: 83.6, target: 74 },
    });
  }
  if (!account.consents.body)
    throw new Error(
      "Le suivi de ce compte a été retiré. Aucune donnée ne sera réinjectée.",
    );
  if (freshAccount || !account.entries.length || !account.profile.toolProfile)
    account = await api<AccountData>("/profile", "PATCH", {
      ...account.profile,
      toolProfile: account.profile.toolProfile ?? toolProfile,
      heightDate: account.profile.heightDate ?? entries[0].date,
      visible: [
        "waist",
        "hips",
        "chest",
        "abdomen",
        "biceps-left",
        "biceps-right",
        "thigh-left",
        "thigh-right",
        "calf-left",
        "calf-right",
      ],
    });
  for (const [index, entry] of entries.entries()) {
    if (account.entries.some((stored) => matchesEntry(stored, entry))) continue;
    await api<Entry>("/entries", "POST", entry);
    console.log(
      `Séance fictive ${index + 1}/${entries.length} : ${entry.date}`,
    );
  }
  const saved = await api<AccountData>("/account");
  for (const entry of entries)
    if (!saved.entries.some((stored) => matchesEntry(stored, entry)))
      throw new Error("Une séance n’a pas été retrouvée après sauvegarde.");
  for (const entry of entries.filter((entry) => entry.tools)) {
    const stored = saved.entries.find((candidate) =>
      matchesEntry(candidate, entry),
    )!;
    const results = entryTools(stored);
    if (
      results.bmi === null ||
      results.waistHips === null ||
      results.abdominal.category === null ||
      results.rfm.value === null ||
      results.energy.value === null
    )
      throw new Error(
        "Les outils d’une séance fictive complète restent indisponibles.",
      );
  }
  console.log(
    JSON.stringify({
      ...summary,
      email: credentials.email,
      totalSavedEntries: saved.entries.length,
      completeToolSessions: entries.filter((entry) => entry.tools).length,
      credentialsFile: credentialsPath,
    }),
  );
} finally {
  await dispose();
}
