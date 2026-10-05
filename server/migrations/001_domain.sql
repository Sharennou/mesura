CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  height REAL, timezone TEXT NOT NULL DEFAULT 'Europe/Paris', visible TEXT NOT NULL DEFAULT '["waist","hips","chest","thigh-left"]'
);
CREATE TABLE consents (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK(purpose IN ('body','photos','push','email')), version TEXT NOT NULL, text TEXT NOT NULL,
  granted INTEGER NOT NULL CHECK(granted IN (0,1)), created_at TEXT NOT NULL
);
CREATE INDEX consent_owner ON consents(user_id, purpose, created_at);
CREATE TABLE measures (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  name TEXT NOT NULL, unit TEXT NOT NULL, archived INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE entries (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  date TEXT NOT NULL, height REAL, values_json TEXT NOT NULL, note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, request_id TEXT NOT NULL,
  UNIQUE(user_id, request_id)
);
CREATE INDEX entries_owner_date ON entries(user_id, date);
CREATE TABLE photos (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  orientation TEXT NOT NULL CHECK(orientation IN ('face','profil','dos')), filename TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL, UNIQUE(entry_id, orientation)
);
CREATE TABLE goals (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  measure_id TEXT NOT NULL, start REAL NOT NULL, target REAL NOT NULL, start_date TEXT NOT NULL
);
CREATE TABLE reminders (
  user_id TEXT PRIMARY KEY REFERENCES user(id) ON DELETE CASCADE,
  enabled INTEGER NOT NULL, weekday INTEGER NOT NULL, frequency TEXT NOT NULL,
  time TEXT NOT NULL, timezone TEXT NOT NULL, anchor TEXT NOT NULL, channel TEXT NOT NULL, next_at TEXT,
  revision TEXT NOT NULL
);
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE, data TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE deliveries (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  occurrence TEXT NOT NULL, revision TEXT NOT NULL, device TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE(user_id, occurrence, revision, device)
);
CREATE TABLE dev_mail (id TEXT PRIMARY KEY, email TEXT NOT NULL, url TEXT NOT NULL, purpose TEXT NOT NULL, expires_at TEXT NOT NULL);
