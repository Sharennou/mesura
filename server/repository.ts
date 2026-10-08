import { db, dataDir } from "./db";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_VISIBLE, STANDARD_MEASURES } from "../shared/catalog";
import { toolContextSchema, toolProfileSchema } from "../shared/tool-schemas";
import type {
  AccountData,
  ConsentPurpose,
  Entry,
  Reminder,
} from "../shared/types";
export function consent(userId: string, purpose: ConsentPurpose): boolean {
  return Boolean(
    (
      db
        .prepare(
          "SELECT granted FROM consents WHERE user_id = ? AND purpose = ? ORDER BY rowid DESC LIMIT 1",
        )
        .get(userId, purpose) as { granted: number } | undefined
    )?.granted,
  );
}
export function getEntries(userId: string): Entry[] {
  return (
    db
      .prepare(
        "SELECT * FROM entries WHERE user_id = ? ORDER BY date DESC, created_at DESC",
      )
      .all(userId) as any[]
  ).map((row) => ({
    id: row.id,
    date: row.date,
    createdAt: row.created_at,
    height: row.height,
    ...(row.tools_json
      ? { tools: toolContextSchema.parse(JSON.parse(row.tools_json)) }
      : {}),
    values: JSON.parse(row.values_json),
    note: row.note,
    photos: (
      db
        .prepare(
          "SELECT id, entry_id, orientation FROM photos WHERE user_id = ? AND entry_id = ?",
        )
        .all(userId, row.id) as any[]
    ).map((p) => ({
      id: p.id,
      entryId: p.entry_id,
      orientation: p.orientation,
    })),
  }));
}
export function getMeasures(userId: string) {
  return [
    ...STANDARD_MEASURES,
    ...(
      db
        .prepare("SELECT * FROM measures WHERE user_id = ?")
        .all(userId) as any[]
    ).map((m) => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      custom: true,
      archived: !!m.archived,
    })),
  ];
}
export function getReminder(userId: string): Reminder | null {
  const r = db
    .prepare("SELECT * FROM reminders WHERE user_id = ?")
    .get(userId) as any;
  return r
    ? {
        enabled: !!r.enabled,
        weekday: r.weekday,
        weekdays: r.weekdays ? JSON.parse(r.weekdays) : [r.weekday],
        frequency: r.frequency,
        time: r.time,
        timezone: r.timezone,
        anchor: r.anchor,
        channel: r.channel,
        nextAt: r.next_at,
      }
    : null;
}
export function accountData(userId: string, name: string): AccountData {
  const p = db
    .prepare("SELECT * FROM profiles WHERE user_id = ?")
    .get(userId) as any;
  const goal = db
    .prepare("SELECT * FROM goals WHERE user_id = ?")
    .get(userId) as any;
  return {
    profile: {
      avatar: p?.avatar ?? null,
      onboardingCompleted: Boolean(p?.onboarding_completed),
      name,
      height: p?.height ?? null,
      heightDate: p?.height_date ?? null,
      ...(p?.tool_profile_json
        ? {
            toolProfile: toolProfileSchema.parse(
              JSON.parse(p.tool_profile_json),
            ),
          }
        : {}),
      timezone: p?.timezone ?? "Europe/Paris",
      visible: p ? JSON.parse(p.visible) : DEFAULT_VISIBLE,
    },
    entries: consent(userId, "body") ? getEntries(userId) : [],
    measures: getMeasures(userId),
    goal: goal
      ? {
          measureId: goal.measure_id,
          start: goal.start,
          target: goal.target,
          startDate: goal.start_date,
        }
      : null,
    consents: {
      body: consent(userId, "body"),
      photos: consent(userId, "photos"),
      push: consent(userId, "push"),
      email: consent(userId, "email"),
    },
    reminder: getReminder(userId),
    devices: (
      db
        .prepare("SELECT COUNT(*) AS n FROM subscriptions WHERE user_id = ?")
        .get(userId) as any
    ).n,
  };
}
export function deletePhotos(userId: string, entryId?: string) {
  const rows = (
    entryId
      ? db
          .prepare("SELECT * FROM photos WHERE user_id = ? AND entry_id = ?")
          .all(userId, entryId)
      : db.prepare("SELECT * FROM photos WHERE user_id = ?").all(userId)
  ) as any[];
  for (const p of rows) {
    db.prepare("DELETE FROM photos WHERE id = ? AND user_id = ?").run(
      p.id,
      userId,
    );
    rmSync(resolve(dataDir, "photos", p.filename), { force: true });
  }
  db.prepare(
    "DELETE FROM entries WHERE user_id = ? AND values_json = '{}' AND trim(note) = '' AND NOT EXISTS (SELECT 1 FROM photos WHERE entry_id = entries.id)",
  ).run(userId);
}
export function cancelReminders(userId: string, channel?: string) {
  if (!channel || channel === "push")
    db.prepare("DELETE FROM subscriptions WHERE user_id = ?").run(userId);
  db.prepare(
    `UPDATE reminders SET enabled = 0, next_at = NULL, revision = ? WHERE user_id = ?${channel ? " AND channel = ?" : ""}`,
  ).run(randomUUID(), userId, ...(channel ? [channel] : []));
}
