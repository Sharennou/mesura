import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
export const dataDir = resolve(process.env.DATA_DIR || "./data");
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
mkdirSync(resolve(dataDir, "photos"), { recursive: true, mode: 0o700 });
export const db = new Database(resolve(dataDir, "mesura.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.pragma("busy_timeout = 5000");
export function migrate() {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
  );
  for (const name of readdirSync(resolve("server/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    if (
      !db.prepare("SELECT name FROM schema_migrations WHERE name = ?").get(name)
    )
      db.transaction(() => {
        db.exec(readFileSync(resolve("server/migrations", name), "utf8"));
        db.prepare("INSERT INTO schema_migrations VALUES (?, ?)").run(
          name,
          new Date().toISOString(),
        );
      })();
  }
}
