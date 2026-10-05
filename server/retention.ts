import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { DateTime } from "luxon";
import { db, dataDir } from "./db";
import { deletePhotos, cancelReminders } from "./repository";
// Keep this ledger independently from database backups in production.
const ledgerPath = resolve(
  process.env.DELETION_LEDGER || resolve(dataDir, "deletion-ledger.jsonl"),
);
export function eraseAccount(userId: string, record = true) {
  const user = db
    .prepare("SELECT email FROM user WHERE id = ?")
    .get(userId) as any;
  if (record) {
    mkdirSync(dirname(ledgerPath), { recursive: true, mode: 0o700 });
    appendFileSync(
      ledgerPath,
      JSON.stringify({ userId, deletedAt: new Date().toISOString() }) + "\n",
      { mode: 0o600 },
    );
  }
  cancelReminders(userId);
  deletePhotos(userId);
  db.transaction(() => {
    if (user)
      db.prepare("DELETE FROM dev_mail WHERE email = ?").run(user.email);
    // Reset verifications contain an opaque value; revoke any reference to this id.
    db.prepare("DELETE FROM verification WHERE value = ? OR value LIKE ?").run(
      userId,
      `%${userId}%`,
    );
    db.prepare("DELETE FROM user WHERE id = ?").run(userId);
  })();
}
export function enforceDeletionLedger(now = DateTime.now()) {
  if (!existsSync(ledgerPath)) return;
  const rows = readFileSync(ledgerPath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { userId: string; deletedAt: string });
  for (const row of rows)
    if (db.prepare("SELECT id FROM user WHERE id = ?").get(row.userId))
      eraseAccount(row.userId, false);
  const retained = rows.filter(
    (row) => DateTime.fromISO(row.deletedAt) > now.minus({ days: 35 }),
  );
  if (retained.length !== rows.length)
    writeFileSync(
      ledgerPath,
      retained.map((row) => JSON.stringify(row) + "\n").join(""),
      { mode: 0o600 },
    );
}
export function purgeExpiredData(now = DateTime.now()) {
  enforceDeletionLedger(now);
  // Dormant personal accounts have no continuing purpose after 24 months.
  const inactive = db
    .prepare(
      "SELECT u.id FROM user u LEFT JOIN profiles p ON p.user_id = u.id WHERE (p.last_active IS NOT NULL AND p.last_active < ?) OR (u.emailVerified = 0 AND u.createdAt < ?)",
    )
    .all(
      now.minus({ months: 24 }).toUTC().toISO(),
      now.minus({ days: 7 }).toUTC().toISO(),
    ) as { id: string }[];
  for (const user of inactive) eraseAccount(user.id);
  db.prepare("DELETE FROM verification WHERE expiresAt < ?").run(
    now.toUTC().toISO(),
  );
}
