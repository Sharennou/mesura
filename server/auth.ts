import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import nodemailer from "nodemailer";
import { db, dataDir, migrate } from "./db";
import { APP_NAME } from "../shared/config";
export const production = process.env.NODE_ENV === "production";
export const appURL = process.env.APP_URL || "http://localhost:5173";
export const emailConfigured = Boolean(
  process.env.SMTP_HOST && process.env.MAIL_FROM,
);
if (
  production &&
  (!process.env.BETTER_AUTH_SECRET ||
    !appURL.startsWith("https://") ||
    !emailConfigured)
)
  throw new Error("Production : configurez HTTPS, BETTER_AUTH_SECRET et SMTP.");
const secretFile = resolve(dataDir, ".auth-secret");
if (!production && !existsSync(secretFile))
  writeFileSync(secretFile, randomBytes(48).toString("base64"), {
    mode: 0o600,
  });
const secret =
  process.env.BETTER_AUTH_SECRET || readFileSync(secretFile, "utf8");
export const mailer = emailConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    })
  : null;
async function sendAccessMail(email: string, url: string, purpose: string) {
  if (mailer)
    await mailer.sendMail({
      from: process.env.MAIL_FROM,
      to: email,
      subject: `${APP_NAME} — ${purpose === "verify" ? "Vérifiez votre adresse" : "Récupérez votre accès"}`,
      text: `Ce lien vous permet de ${purpose === "verify" ? "vérifier votre adresse" : "choisir un nouveau mot de passe"} :\n${url}\nSi vous n’êtes pas à l’origine de cette demande, ignorez ce message.`,
    });
  else if (!production)
    db.prepare("INSERT INTO dev_mail VALUES (?, ?, ?, ?, ?)").run(
      randomUUID(),
      email,
      url,
      purpose,
      new Date(Date.now() + 15 * 60_000).toISOString(),
    );
}
export const auth = betterAuth({
  appName: APP_NAME,
  baseURL: appURL,
  secret,
  database: db,
  trustedOrigins: production
    ? [appURL]
    : [appURL, "http://127.0.0.1:5173", "http://localhost:5173"],
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) =>
      sendAccessMail(user.email, url, "reset"),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 3600,
    sendVerificationEmail: async ({ user, url }) =>
      sendAccessMail(user.email, url, "verify"),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  rateLimit: { enabled: true, window: 60, max: 30, storage: "database" },
  advanced: { useSecureCookies: production },
  logger: { disabled: true },
});
export async function initializeDatabase() {
  const migrations = await getMigrations(auth.options);
  await migrations.runMigrations();
  migrate();
}
