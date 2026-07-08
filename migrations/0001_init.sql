-- SiteForge initial schema.
-- D1 is SQLite. IDs are app-generated ULID-ish strings (see src/lib/id.ts).
-- Timestamps are ISO-8601 UTC strings for portability and readable debugging.

-- ---------------------------------------------------------------------------
-- clients — the business/church/person a site is being built for.
-- ---------------------------------------------------------------------------
CREATE TABLE clients (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  contact_email TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ---------------------------------------------------------------------------
-- projects — one website build effort for a client. Carries lifecycle status.
-- ---------------------------------------------------------------------------
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  client_id   TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  -- interview -> ingesting -> generating -> preview -> deployed -> archived
  status      TEXT NOT NULL DEFAULT 'interview',
  industry    TEXT,
  tone        TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_projects_client ON projects(client_id);
CREATE INDEX idx_projects_status ON projects(status);

-- ---------------------------------------------------------------------------
-- interview_sessions — a resumable interview run for a project.
-- `phase` is the current section of the guided interview; `next_question_id`
-- lets a client resume exactly where they left off.
-- ---------------------------------------------------------------------------
CREATE TABLE interview_sessions (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'active', -- active | complete | abandoned
  phase            TEXT NOT NULL DEFAULT 'basics',
  next_question_id TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_sessions_project ON interview_sessions(project_id);

-- ---------------------------------------------------------------------------
-- interview_answers — one row per answered question. Values are JSON so a
-- single table holds strings, lists (pages, socials), and structured objects.
-- Unique on (session_id, question_id) so re-answering upserts cleanly.
-- ---------------------------------------------------------------------------
CREATE TABLE interview_answers (
  id           TEXT PRIMARY KEY,
  session_id   TEXT NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_id  TEXT NOT NULL,
  question_text TEXT NOT NULL,
  -- JSON-encoded answer value. Readers must JSON.parse.
  value_json   TEXT NOT NULL,
  -- 'user' for typed answers, 'ai' when Claude inferred/generated a value.
  source       TEXT NOT NULL DEFAULT 'user',
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (session_id, question_id)
);
CREATE INDEX idx_answers_session ON interview_answers(session_id);

-- ---------------------------------------------------------------------------
-- source_content — normalized data ingested from the client's web presence.
-- Populated in Phase 2. Everything here is CLIENT-REVIEWED before use:
-- `review_status` gates publication (pending -> confirmed | rejected | edited).
-- ---------------------------------------------------------------------------
CREATE TABLE source_content (
  id            TEXT PRIMARY KEY,
  project_id    TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- website | facebook | google_business | instagram | manual
  source_type   TEXT NOT NULL,
  source_url    TEXT,
  -- reliability of the extraction path: high | best_effort | manual
  confidence    TEXT NOT NULL DEFAULT 'best_effort',
  -- normalized fields as JSON: { name, about, hours, contact, palette, ... }
  data_json     TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_source_project ON source_content(project_id);

-- ---------------------------------------------------------------------------
-- assets — files pulled into R2 (scraped images, logos, uploads).
-- The bytes live in R2 under r2_key; this table is the index.
-- ---------------------------------------------------------------------------
CREATE TABLE assets (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  r2_key      TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'image', -- image | logo | document | bundle
  mime_type   TEXT,
  source_url  TEXT,
  alt_text    TEXT,
  width       INTEGER,
  height      INTEGER,
  bytes       INTEGER,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_assets_project ON assets(project_id);

-- ---------------------------------------------------------------------------
-- builds — a generated site version. Bundle bytes live in R2 (bundle_r2_key).
-- Versioned per project for preview + one-click rollback (Phase 3/4).
-- ---------------------------------------------------------------------------
CREATE TABLE builds (
  id             TEXT PRIMARY KEY,
  project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version        INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending', -- pending | building | ready | failed | deployed
  theme_id       TEXT,
  bundle_r2_key  TEXT,
  preview_url    TEXT,
  -- generation inputs/decisions snapshot as JSON, for reproducible rebuilds.
  spec_json      TEXT,
  lighthouse_json TEXT,
  notes          TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (project_id, version)
);
CREATE INDEX idx_builds_project ON builds(project_id);

-- ---------------------------------------------------------------------------
-- job_log — durable record of async jobs (scrape/build) for observability.
-- ---------------------------------------------------------------------------
CREATE TABLE job_log (
  id          TEXT PRIMARY KEY,
  project_id  TEXT REFERENCES projects(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL, -- scrape | build | deploy
  status      TEXT NOT NULL DEFAULT 'queued', -- queued | running | done | error
  detail_json TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_joblog_project ON job_log(project_id);
