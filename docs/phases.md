# Build phases

SiteForge is built phase by phase to a deployable v1. **No phase starts until the
previous phase's deliverable is verified working** (see `.context/verification.md`).
Update `PROGRESS.md` after every session.

Status legend: `done` · `in progress` · `planned`.

## Phase 0 — Foundation · in progress (this session)

Initialize the Workers project: `wrangler.toml` with all bindings, the Hono app
(`src/index.ts`), the D1 schema (`migrations/0001_init.sql`), R2/KV/Queues/AI/Browser
bindings, deploy scripts (`package.json`), and the typed lib layer (`lib/db`,
`lib/errors`, `lib/id`, `lib/config`, `lib/anthropic`).

**Deliverable:** `wrangler deploy` works and a hello-world API responds —
`GET /api/health` (liveness) and `GET /api/ready` (touches D1 + KV, checks the
Anthropic secret) return `ok`.

## Phase 1 — Interview Engine · in progress (this session)

D1 schema for clients/projects/sessions/answers, the adaptive-but-deterministic
interview API, session persistence and resume. Question bank
(`src/interview/questions.ts`) + engine (`src/interview/engine.ts`); operator project
routes (`src/routes/projects.ts`) and client interview routes
(`src/routes/interview.ts`). Claude enrichment (page suggestions, thin-answer
follow-ups) layered on, fail-open. A minimal web UI (`/interview.html`) is the
remaining client-facing piece.

**Deliverable:** complete an interview end to end and read the structured
`SiteProfile` JSON from `GET /api/interview/:sessionId/profile`.

## Phase 2 — Ingestion Pipeline · planned

Browser Rendering scrape worker driven by Queues (`INGEST_QUEUE`, consumer in
`src/queue/consumer.ts`); website extractor (text, structure, images→R2, meta,
palette, contacts); Facebook tiered ingestion (Graph API if connected → best-effort
public scrape → manual paste, degrading gracefully, never presenting best-effort as
reliable); Google Business Profile listing; the R2 asset pipeline; and the client
review/confirm UI. All ingested data normalizes into `source_content` and is gated by
`review_status` before use.

**Deliverable:** paste a URL, get reviewed structured content.

## Phase 3 — Generation Engine · planned

Theme library of 6–10 professionally designed base templates (built to
`frontend-design` standards); the Claude generation pipeline (template + palette +
typography + generated copy + client images → static bundle); bundle assembly to R2;
preview deploys. No lorem ipsum ever reaches a preview — every section gets real
content.

**Deliverable:** interview + ingestion → a live preview site.

## Phase 4 — Revision & Production Deploy · planned

Natural-language revision loop (client feedback → regenerated diff);
versioning/rollback via `builds.version` + R2 bundles; production deploy flow;
automated Lighthouse and accessibility checks as build gates (`lighthouse_json`,
90+ required). One-command rebuild/redeploy from stored state.

**Deliverable:** revise a live site by describing the change; deploy and roll back on
command.

## Phase 5 — Polish & Extend · planned

Custom domains (Cloudflare for SaaS), multi-tenant auth (replacing the v1 operator
token / Cloudflare Access), MCP server exposure so other Claude sessions can trigger
builds, and billing hooks if productized.

**Deliverable:** productization surface — domains, tenants, programmatic build access.
