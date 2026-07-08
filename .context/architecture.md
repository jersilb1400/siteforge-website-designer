# Architecture

SiteForge is a single Cloudflare Worker (TypeScript + Hono) plus a set of
Cloudflare bindings. The Worker owns the `/api/*` surface and the async ingestion
queue consumer; everything else falls through to static assets. There is no
separate backend server and no external database — the whole system lives on one
Cloudflare account, which is what keeps infra under $10/month.

Entry point: `src/index.ts`. Binding shape: `src/types.ts` (`Env`). Config:
`wrangler.toml`.

## The stack and why each binding exists

| Binding | Cloudflare service | Why it's here | Config |
|---|---|---|---|
| `ASSETS` | Workers Static Assets | Serves the SiteForge dashboard and generated-site previews. Static files served directly; unmatched paths fall through to the Worker. | `wrangler.toml [assets]`, dir `./public` |
| `DB` | D1 (SQLite) | Relational store: clients, projects, interview sessions/answers, ingested content, assets index, builds, job log. | `[[d1_databases]]`, `migrations/` |
| `KV` | Workers KV | Sessions, scrape cache, rate limiting. Touched in the readiness check. | `[[kv_namespaces]]` |
| `R2` | R2 object storage | Bundle/asset bytes: site bundles, scraped images, logos, versioned backups. D1 holds the index (`assets.r2_key`, `builds.bundle_r2_key`); R2 holds the bytes. | `[[r2_buckets]]` |
| `INGEST_QUEUE` | Queues | Async scrape + build jobs (Phase 2+). Producer + consumer both bound; DLQ + retries configured. | `[[queues.producers]]` / `[[queues.consumers]]` |
| `AI` | Workers AI | Cheap classification fallback (Phase 2+). Optional in `Env`. | `[ai]` |
| `BROWSER` | Browser Rendering | Renders/extracts existing client sites during ingestion (Phase 2). Optional in `Env`. | `[browser]` |

Secrets (not bindings): `ANTHROPIC_API_KEY` and `OPERATOR_TOKEN`, set via
`wrangler secret put` / `.dev.vars` — never in `wrangler.toml`. Non-secret vars
`ENVIRONMENT`, `ANTHROPIC_MODEL_SMART`, `ANTHROPIC_MODEL_CHEAP` live in
`[vars]`.

> Binding IDs in `wrangler.toml` are placeholders (`PLACEHOLDER_D1_DATABASE_ID`
> etc.) until provisioned under a real Cloudflare login. See `decisions.md`.

## Request flow

`src/index.ts` builds one Hono app:

1. **Request-id middleware** — sets `requestId` from the `cf-ray` header or a
   generated id, echoes it as `x-request-id`, and carries it into every log line
   and error response for correlation.
2. **`logger()`** on all routes; **`secureHeaders()`** on `/api/*`.
3. **API sub-app** mounted at `/api`, composed of three route modules:
   - `routes/health.ts` → `/api/health`, `/api/ready`
   - `routes/projects.ts` → `/api/projects*` (operator-gated)
   - `routes/interview.ts` → `/api/interview/*` (session-id gated)
4. **Error handling** — `app.onError` turns typed `AppError`s (`src/lib/errors.ts`)
   into uniform JSON `{ error: { code, message, detail }, requestId }`; anything
   else becomes a logged 500. Unknown `/api/*` routes return JSON 404 rather than
   falling through to assets.
5. **Static fallback** — `app.get('*')` serves everything else via
   `c.env.ASSETS.fetch()` (dashboard + previews + SPA fallback).
6. **Queue consumer** — the default export also exposes `queue()`, delegating to
   `src/queue/consumer.ts`.

Data-access is centralized in `src/lib/db.ts` (`one`, `all`, `run`, `batch`,
`now`) so the JSON-column convention and prepared-statement boilerplate live in
one place. IDs come from `src/lib/id.ts` — time-sortable, prefixed
(`proj_`, `sess_`, `ans_`, `job_`, …).

## Interview engine

Deliberately **deterministic at its core, with Claude used only to enrich** — never
as the source of truth for flow progression. This makes the interview testable
without a network and resumable from stored answers.

- **Question bank** (`src/interview/questions.ts`) — an ordered, declarative
  `QUESTIONS` array across eight phases (`basics → goals → pages → brand →
  presence → contact → tone → content`). Each question can declare `skipIf(answers)`
  to drop out when prior answers make it irrelevant (e.g. `donation_url` only if
  "Collect donations" is a goal). `INDUSTRY_PAGE_DEFAULTS` maps industry → default
  page set.
- **Engine** (`src/interview/engine.ts`) — pure functions walk the bank against
  the stored answer map: `nextQuestion(answers)`, `progress(answers)`,
  `parseAnswers(rows)`, and `buildProfile(answers)` which assembles the normalized
  `SiteProfile` (the Phase 1 deliverable that everything downstream reads).
- **Claude enrichment** — two optional, fail-open hooks call the cheap model:
  `resolveOptions()` tailors the suggested page list to the specific business, and
  `maybeFollowUp()` asks one adaptive follow-up when a free-text `story` answer is
  too thin. Both fall back to static behavior when `ANTHROPIC_API_KEY` is absent or
  the call fails — the interview never blocks on AI.

Answers persist per `(session_id, question_id)` with an upsert
(`ON CONFLICT DO UPDATE`), so re-answering is idempotent and sessions resume
exactly where the client left off. Completing the last question flips the session
to `complete` and advances the project from `interview` to `ingesting`.

Model routing lives in `src/lib/config.ts` (`models(env)` → `{ smart, cheap }`);
the Anthropic client wrapper is `src/lib/anthropic.ts`.

## Ingestion pipeline (Phase 2+ shape)

Async work flows through Queues so scrape/build jobs don't block requests:

```
producer (route handler)  ->  INGEST_QUEUE  ->  queue() consumer  ->  D1 job_log
                                                      |
                                            (Phase 2) Browser Rendering scrape
                                                      + extract -> source_content
                                                      + download assets -> R2
```

Jobs are typed by `IngestJob` in `src/types.ts` (`scrape_website`,
`scrape_facebook`, `scrape_google_business`). The consumer
(`src/queue/consumer.ts`) currently records each job to `job_log` and
`ack()`/`retry()`s it — this proves the producer→queue→consumer→D1 wiring end to
end for Phase 0/1. Phase 2 fills in the `TODO`: dispatch on `job.kind` to the
Browser Rendering scrape + extraction, normalize into `source_content`, and pull
images into R2. Everything ingested is gated by `source_content.review_status`
(pending → confirmed | rejected | edited) before it can be used.
