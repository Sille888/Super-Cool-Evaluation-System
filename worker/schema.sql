-- Bewertungs-App – D1 Schema
-- Globale Einstellungen (u.a. Admin-Passwort-Hash)
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Projekte (z.B. "Vorträge 12c")
CREATE TABLE IF NOT EXISTS projects (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  evaluation_unlocked INTEGER NOT NULL DEFAULT 0,
  created_at          INTEGER NOT NULL
);

-- Bewertungskriterien (gehören zu einem Projekt)
CREATE TABLE IF NOT EXISTS criteria (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL,          -- 'stars' | 'text'
  star_labels TEXT,                   -- JSON-Array mit 5 Strings (optional)
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_criteria_project ON criteria(project_id);

-- Projektgruppen (gehören zu einem Projekt)
CREATE TABLE IF NOT EXISTS groups (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name       TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_groups_project ON groups(project_id);

-- Optionale Teilnehmer einer Gruppe
CREATE TABLE IF NOT EXISTS group_participants (
  id       TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  name     TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_participants_group ON group_participants(group_id);

-- Zuordnung Kriterium <-> Gruppe inkl. Reihenfolge (pro Gruppe)
CREATE TABLE IF NOT EXISTS group_criteria (
  id           TEXT PRIMARY KEY,
  group_id     TEXT NOT NULL,
  criterion_id TEXT NOT NULL,
  position     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_gc_group ON group_criteria(group_id);

-- Eine abgegebene Bewertung (ein Bewerter, alle Gruppen)
CREATE TABLE IF NOT EXISTS submissions (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_submissions_project ON submissions(project_id);

-- Einzelantworten einer Bewertung
CREATE TABLE IF NOT EXISTS answers (
  id            TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  group_id      TEXT NOT NULL,
  criterion_id  TEXT NOT NULL,
  stars         INTEGER,
  text          TEXT
);
CREATE INDEX IF NOT EXISTS idx_answers_submission ON answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_criterion ON answers(criterion_id);
