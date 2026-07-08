# Domain model and glossary

The nouns SiteForge is built around, in plain language, and the lifecycle status
values that move them along. The authoritative schema is
`migrations/0001_init.sql`; `docs/data-model.md` documents columns and relationships
in detail.

## Entities

**Client** — the business, church, nonprofit, or person a site is being built for.
Minimal: `name`, optional `contact_email`. One client can have many projects.

**Project** — one website build effort for a client. Carries the overall lifecycle
`status` and cached `industry` / `tone` (copied up from the interview so lists and
generation can read them without joining answers). Deleting a client cascades to its
projects.

**Interview session** — a resumable run of the guided interview for a project. Tracks
which `phase` the client is in and `next_question_id` so they resume exactly where
they left off. A project's most recent session is the active one.

**Interview answer** — one row per answered question, unique on
`(session_id, question_id)` so re-answering upserts cleanly. `value_json` holds the
answer as JSON (string, list, boolean, or object). `source` is `user` for typed
answers or `ai` when Claude inferred/generated the value. The engine parses these
rows into the answer map that drives flow and builds the `SiteProfile`.

**Source content** — normalized data ingested from the client's existing web presence
(Phase 2), one row per source. `source_type` is `website | facebook |
google_business | instagram | manual`; `data_json` holds normalized fields
(name, about, hours, contact, palette, …). This is the **client-review gate**: nothing
here is used until a human confirms it — see `review_status` below. `confidence`
records how reliable the extraction path was (`high | best_effort | manual`), which
matters most for fragile Facebook scraping.

**Asset** — a file pulled into R2 (scraped image, logo, upload, or generated bundle).
The bytes live in R2 under `r2_key`; this table is the searchable index (kind,
mime, dimensions, alt text, source URL).

**Build (version)** — a generated site version for a project, numbered per project
(`UNIQUE(project_id, version)`) for preview and one-click rollback. The bundle bytes
live in R2 (`bundle_r2_key`); `spec_json` snapshots the generation inputs/decisions
so a build is **reproducible from stored state** (the one-command-rebuild success
criterion). `lighthouse_json` holds the automated quality-gate scores.

**Job** — a durable record in `job_log` of an async task (`scrape | build | deploy`)
for observability. Written by the Queues consumer as ingestion/build work runs.

## Lifecycle status values

**Project `status`** (`projects.status`, default `interview`):

```
interview -> ingesting -> generating -> preview -> deployed -> archived
```

- `interview` — collecting answers via the interview engine.
- `ingesting` — interview complete; pulling/reviewing web-presence content. (The
  interview engine flips the project here when the last question is answered.)
- `generating` — assembling a site build.
- `preview` — a build is live at a preview URL awaiting client feedback.
- `deployed` — a build is live in production.
- `archived` — retired.

**Interview session `status`** (default `active`): `active | complete | abandoned`.
Completing the final question sets `complete` and clears `next_question_id`.

**Source content `review_status`** (default `pending`) — the publication gate:
`pending → confirmed | rejected | edited`. Only confirmed/edited content may be used
in generation. This enforces the content-ethics rule: scraped content is never
published without client review.

**Build `status`** (default `pending`): `pending | building | ready | failed |
deployed`.

**Job `status`** (`job_log.status`, default `queued`): `queued | running | done |
error`. The Phase 0/1 consumer records jobs as `queued`; retries are driven by the
Queues config (`max_retries`, DLQ).

## Interview phases

The interview bank (`src/interview/questions.ts`) walks eight phases in order:
`basics → goals → pages → brand → presence → contact → tone → content`. Phases group
questions; the engine skips any question whose `skipIf` matches prior answers, so the
visible set is adaptive per client. `interview_sessions.phase` records the current
group.
