import { db, dataDir } from "./db";
import { consent, getReminder } from "./repository";
import { nextOccurrences } from "../shared/recurrence";
import { APP_NAME } from "../shared/config";
import { DateTime } from "luxon";
import webpush from "web-push";
import { mailer } from "./auth";
import { randomUUID } from "node:crypto";
import { readdirSync, rmSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { purgeExpiredData } from "./retention";
export const pushConfigured = Boolean(
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT,
);
if (pushConfigured)
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
let running = false;
export async function runJobs(now = DateTime.now()) {
  if (running) return;
  running = true;
  try {
    purgeExpiredData(now);
    const due = db
      .prepare("SELECT * FROM reminders WHERE enabled = 1 AND next_at <= ?")
      .all(now.toUTC().toISO()) as any[];
    for (const row of due) {
      const current = db
        .prepare(
          "SELECT * FROM reminders WHERE user_id = ? AND revision = ? AND enabled = 1",
        )
        .get(row.user_id, row.revision) as any;
      if (!current || !consent(row.user_id, row.channel)) continue;
      // Missing occurrences older than one hour are skipped, never replayed in a burst.
      if (now.diff(DateTime.fromISO(row.next_at), "minutes").minutes <= 60) {
        const devices =
          row.channel === "push"
            ? (db
                .prepare("SELECT * FROM subscriptions WHERE user_id = ?")
                .all(row.user_id) as any[])
            : [{ id: "email" }];
        for (const device of devices) {
          const allowed = db
            .prepare(
              "SELECT enabled, revision FROM reminders WHERE user_id = ?",
            )
            .get(row.user_id) as any;
          if (
            !allowed?.enabled ||
            allowed.revision !== row.revision ||
            !consent(row.user_id, row.channel)
          )
            break;
          const id = randomUUID();
          const claim = db
            .prepare(
              "INSERT OR IGNORE INTO deliveries VALUES (?, ?, ?, ?, ?, ?, ?)",
            )
            .run(
              id,
              row.user_id,
              row.next_at,
              row.revision,
              device.id,
              "claimed",
              now.toUTC().toISO(),
            );
          if (!claim.changes) continue;
          try {
            if (row.channel === "push" && pushConfigured)
              await webpush.sendNotification(
                JSON.parse(device.data),
                JSON.stringify({
                  title: APP_NAME,
                  body: "Votre rendez-vous de mesures vous attend.",
                  url: "/",
                  tag: `reminder-${row.next_at}`,
                }),
                { TTL: 3600, timeout: 10000 },
              );
            else if (row.channel === "email" && mailer) {
              const user = db
                .prepare("SELECT email, emailVerified FROM user WHERE id = ?")
                .get(row.user_id) as any;
              if (!user?.emailVerified) throw new Error("unverified");
              await mailer.sendMail({
                from: process.env.MAIL_FROM,
                to: user.email,
                subject: `${APP_NAME} — Votre rendez-vous de mesures`,
                text: "Votre rendez-vous de mesures vous attend.",
              });
            } else throw new Error("unconfigured");
            db.prepare("UPDATE deliveries SET status = ? WHERE id = ?").run(
              "sent",
              id,
            );
          } catch (error: any) {
            db.prepare("UPDATE deliveries SET status = ? WHERE id = ?").run(
              "failed",
              id,
            );
            if (error.statusCode === 404 || error.statusCode === 410)
              db.prepare(
                "DELETE FROM subscriptions WHERE id = ? AND user_id = ?",
              ).run(device.id, row.user_id);
          }
        }
      }
      const next = nextOccurrences(getReminder(row.user_id)!, now, 1)[0];
      db.prepare(
        "UPDATE reminders SET next_at = ? WHERE user_id = ? AND revision = ?",
      ).run(next ?? null, row.user_id, row.revision);
    }
    db.prepare("DELETE FROM dev_mail WHERE expires_at < ?").run(
      now.toUTC().toISO(),
    );
    db.prepare("DELETE FROM deliveries WHERE created_at < ?").run(
      now.minus({ days: 30 }).toUTC().toISO(),
    );
    db.prepare("DELETE FROM session WHERE expiresAt < ?").run(
      now.toUTC().toISO(),
    );
    const files = new Set(
      (db.prepare("SELECT filename FROM photos").all() as any[]).map(
        (p) => p.filename,
      ),
    );
    for (const filename of readdirSync(resolve(dataDir, "photos")))
      if (
        !files.has(filename) &&
        Date.now() - statSync(resolve(dataDir, "photos", filename)).mtimeMs >
          3600000
      )
        rmSync(resolve(dataDir, "photos", filename), { force: true });
  } finally {
    running = false;
  }
}
