# SiteForge

AI website design & creation app on Cloudflare. It runs a guided client
interview, ingests the client's existing web presence, generates a modern
static HTML site, previews it, and deploys — all on Cloudflare infrastructure.
Single operator (Jeremy) for v1.

**Read `.context/` first.** The living project knowledge lives there:
`.context/mission.md`, `architecture.md`, `decisions.md` (ADR log),
`domain.md`, `verification.md`. `docs/` holds `phases.md`, `data-model.md`,
`api.md`. The autonomous build loop is defined in `LOOP.md`; current status in
`PROGRESS.md`.

## Stack (locked — see .context/decisions.md before changing)

- **Cloudflare Workers** + **Hono** (TypeScript) — API + orchestration
- **D1** (SQLite) — clients, projects, interview answers, builds (`migrations/`)
- **R2** — site bundles, scraped assets, backups
- **KV** — sessions, scrape cache, rate limiting
- **Queues** — async scrape/build jobs
- **Browser Rendering** — ingest existing sites (Phase 2)
- **Anthropic API** — interview intelligence + content/design generation
  (routing: `claude-sonnet-5` smart / `claude-haiku-4-5-20251001` cheap)
- **Static assets** — dashboard UI + generated-site previews (`public/`)

## Layout

```
src/
  index.ts            Worker entry: Hono app, /api/* routes, assets fallback, queue handler
  types.ts            Env bindings + job types
  lib/                anthropic, db helpers, ids, errors, config
  middleware/auth.ts  operator-token gate (v1)
  routes/             health, projects, interview
  interview/          questions.ts (bank), engine.ts (adaptive flow + profile)
  queue/consumer.ts   ingestion consumer (stub → Phase 2)
migrations/           D1 schema
public/               dashboard + interview UI (static assets)
```

## Commands

```
npm install
npm run typecheck                 # tsc --noEmit
npx wrangler deploy --dry-run     # validate config + bundle
npm run dev                       # wrangler dev (needs .dev.vars)
npm test                          # vitest
npm run db:local                  # apply migrations to local D1
./setup.sh                        # provision D1/KV/R2 under your CF login
```

## Conventions

- **Secrets** live in Wrangler secrets / `.dev.vars` only — never in code or
  committed files. Binding IDs in `wrangler.toml` are not secret.
- **Errors**: throw typed `AppError`s (`src/lib/errors.ts`); the global handler
  turns them into consistent JSON.
- **IDs**: app-generated, time-sortable, prefixed (`src/lib/id.ts`).
- **Answers** are stored JSON-encoded (`value_json`); parse via the engine.
- **Content ethics**: scraped/ingested content is always client-reviewed before
  publication (`source_content.review_status`). Never publish unreviewed scrapes.
- **Generated sites** must hit Lighthouse 90+, WCAG 2.1 AA, semantic HTML,
  mobile-first — governed by the `frontend-design` skill.

## Escalate to Jeremy before

Any paid API signup, spend beyond ~$5/mo Cloudflare + Anthropic usage, Facebook
Graph API app registration, or custom domain purchases.
