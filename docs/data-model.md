# Data model

The D1 (SQLite) schema, derived from `migrations/0001_init.sql`. Conventions:

- **IDs** are app-generated, time-sortable, prefixed strings (`src/lib/id.ts`) — not
  integers. So PKs sort chronologically without a separate timestamp index.
- **Timestamps** are ISO-8601 UTC strings (`strftime('%Y-%m-%dT%H:%M:%fZ','now')`)
  for portability and readable debugging.
- **JSON columns** (`*_json`) hold variable-shaped data as text; readers `JSON.parse`.
- **Foreign keys** cascade on delete from the parent down (`ON DELETE CASCADE`).

## Entity diagram

```
                         +-----------+
                         |  clients  |
                         +-----------+
                               | 1
                               | N   (client_id, CASCADE)
                         +-----------+
                         | projects  |
                         +-----------+
             1 /  1 |  1 |  1 |  1 |  0..1 \ (project_id, CASCADE on all)
              /     |    |    |    |        \
             v      v    v    v    v         v
  interview_sessions  source_  assets  builds   job_log
        | 1           content
        | N  (session_id, CASCADE)
        v
  interview_answers      (UNIQUE session_id+question_id)
```

- `clients 1—N projects`
- `projects 1—N interview_sessions 1—N interview_answers`
- `projects 1—N source_content`, `1—N assets`, `1—N builds`, `1—N job_log`
  (`job_log.project_id` is nullable — a job can exist without a project)

## Tables

### clients
The business/church/person a site is built for.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | app-generated (`client_…`) |
| `name` | TEXT NOT NULL | |
| `contact_email` | TEXT | nullable |
| `created_at` / `updated_at` | TEXT NOT NULL | ISO-8601 UTC default |

### projects
One website build effort for a client. Carries overall lifecycle status.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `proj_…` |
| `client_id` | TEXT NOT NULL | → `clients(id)` CASCADE |
| `name` | TEXT NOT NULL | |
| `status` | TEXT NOT NULL | default `interview`; `interview → ingesting → generating → preview → deployed → archived` |
| `industry` | TEXT | cached from interview |
| `tone` | TEXT | cached from interview |
| `created_at` / `updated_at` | TEXT NOT NULL | |

Indexes: `idx_projects_client(client_id)`, `idx_projects_status(status)`.

### interview_sessions
A resumable interview run for a project.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `sess_…`; also serves as the client's capability token |
| `project_id` | TEXT NOT NULL | → `projects(id)` CASCADE |
| `status` | TEXT NOT NULL | default `active`; `active | complete | abandoned` |
| `phase` | TEXT NOT NULL | default `basics`; current interview phase |
| `next_question_id` | TEXT | where to resume; NULL when complete |
| `created_at` / `updated_at` | TEXT NOT NULL | |

Index: `idx_sessions_project(project_id)`.

### interview_answers
One row per answered question. Values are JSON so one table holds every answer shape.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `ans_…` |
| `session_id` | TEXT NOT NULL | → `interview_sessions(id)` CASCADE |
| `question_id` | TEXT NOT NULL | matches a `Question.id` in the bank |
| `question_text` | TEXT NOT NULL | snapshot of the prompt shown |
| `value_json` | TEXT NOT NULL | JSON-encoded answer; readers must `JSON.parse` |
| `source` | TEXT NOT NULL | default `user`; `user` typed, `ai` inferred/generated |
| `created_at` / `updated_at` | TEXT NOT NULL | |

Constraint: `UNIQUE(session_id, question_id)` — re-answering upserts cleanly.
Index: `idx_answers_session(session_id)`.

### source_content
Normalized data ingested from the client's web presence (Phase 2). Client-reviewed
before use.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `project_id` | TEXT NOT NULL | → `projects(id)` CASCADE |
| `source_type` | TEXT NOT NULL | `website | facebook | google_business | instagram | manual` |
| `source_url` | TEXT | nullable |
| `confidence` | TEXT NOT NULL | default `best_effort`; `high | best_effort | manual` |
| `data_json` | TEXT NOT NULL | normalized fields `{ name, about, hours, contact, palette, … }` |
| `review_status` | TEXT NOT NULL | default `pending`; **publication gate** `pending → confirmed | rejected | edited` |
| `created_at` / `updated_at` | TEXT NOT NULL | |

Index: `idx_source_project(project_id)`.

### assets
Files pulled into R2 (scraped images, logos, uploads, bundles). This table is the
index; bytes live in R2 under `r2_key`.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `project_id` | TEXT NOT NULL | → `projects(id)` CASCADE |
| `r2_key` | TEXT NOT NULL | key of the bytes in R2 |
| `kind` | TEXT NOT NULL | default `image`; `image | logo | document | bundle` |
| `mime_type` | TEXT | |
| `source_url` | TEXT | where it came from |
| `alt_text` | TEXT | |
| `width` / `height` / `bytes` | INTEGER | |
| `created_at` | TEXT NOT NULL | |

Index: `idx_assets_project(project_id)`.

### builds
A generated site version. Bundle bytes live in R2. Versioned per project for preview
and rollback.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | |
| `project_id` | TEXT NOT NULL | → `projects(id)` CASCADE |
| `version` | INTEGER NOT NULL | per-project version number |
| `status` | TEXT NOT NULL | default `pending`; `pending | building | ready | failed | deployed` |
| `theme_id` | TEXT | chosen template |
| `bundle_r2_key` | TEXT | bundle bytes in R2 |
| `preview_url` | TEXT | |
| `spec_json` | TEXT | generation inputs/decisions snapshot — enables reproducible rebuild |
| `lighthouse_json` | TEXT | automated quality-gate scores |
| `notes` | TEXT | |
| `created_at` / `updated_at` | TEXT NOT NULL | |

Constraint: `UNIQUE(project_id, version)`. Index: `idx_builds_project(project_id)`.

### job_log
Durable record of async jobs (scrape/build/deploy) for observability. Written by the
Queues consumer.

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | `job_…` |
| `project_id` | TEXT | nullable → `projects(id)` CASCADE |
| `kind` | TEXT NOT NULL | `scrape | build | deploy` |
| `status` | TEXT NOT NULL | default `queued`; `queued | running | done | error` |
| `detail_json` | TEXT | the job payload / result |
| `created_at` / `updated_at` | TEXT NOT NULL | |

Index: `idx_joblog_project(project_id)`.
