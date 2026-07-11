# SiteForge

AI website design & creation app on Cloudflare. It runs a guided client
interview, ingests the client's existing web presence, generates a modern
multi-page static HTML site, previews it, and deploys — all on Cloudflare
infrastructure. Single operator (Jeremy) for v1.

**Production:** `https://websiteforge.cc` (Worker: `siteforge.jersilb.workers.dev`)

**Read `.context/` first.** Living project knowledge:
`.context/mission.md`, `architecture.md`, `decisions.md` (ADR log),
`domain.md`, `verification.md`. `docs/` holds `phases.md`, `data-model.md`,
`api.md`. Autonomous build loop: `LOOP.md`; **current status: `PROGRESS.md`**.

## Current status (2026-07-10)

Phases 0–4 are **production verified**. Phase 5 MCP + forge operator chrome shipped;
custom domains / multi-tenant / billing remain escalation-gated.

Generation quality bar (ADR-0020 + ADR-0021):
- **8 themes** + **6 composition recipes** with distinct aesthetic blueprints
  (Barely There, Kinetic Type, Bento-Tactile, Neon Mono, Conversion Journey, Dynamic Type)
- Multi-page sites (home / about / services / gallery / contact + team / faq / give / visit)
- OpenRouter FLUX.2 Klein 4B art-directed photos; client logo/photo uploads
- Conversion copy + design critique fix pass; Lighthouse 90+ gate
- Sales demos via `POST /api/demos`

See `PROGRESS.md` for the status table, demo preview URLs, and known gaps.

## Stack (locked — see .context/decisions.md before changing)

- **Cloudflare Workers** + **Hono** (TypeScript) — API + orchestration
- **D1** (SQLite) — clients, projects, interview answers, builds (`migrations/`)
- **R2** — site bundles, scraped/generated assets, backups
- **KV** — sessions, scrape cache, rate limiting
- **Queues** — async scrape/build jobs
- **Browser Rendering** — ingest existing sites (binding present; fetch path is default)
- **Anthropic API** — interview intelligence + content/design/critique
  (routing: `claude-sonnet-5` smart / `claude-haiku-4-5-20251001` cheap)
- **OpenRouter** — site photography (`black-forest-labs/flux.2-klein-4b`)
- **Static assets** — operator dashboard + interview UI (`public/`)

## Layout

```
src/
  index.ts              Worker entry: Hono app, /api/*, assets fallback, queue handler
  types.ts              Env bindings + job types
  lib/                  anthropic, openrouter, db, ids, errors, config
  middleware/auth.ts    operator-token gate (v1)
  routes/               health, projects, interview, generate, demos, uploads, mcp, …
  interview/            questions.ts, engine.ts
  generate/             bundle, render, sections, content, critique, design-director
    composition/        recipe catalog (layout shapes)
    themes/             8 theme skeletons + base CSS
    images/             OpenRouter prompts + gap-fill
    demo/               sales-demo catalog + photo ingest
  ingest/               extract, assets, pipeline
  queue/consumer.ts     ingestion consumer
  mcp/server.ts         operator MCP tools
migrations/             D1 schema
public/                 forge chrome (dashboard, interview, how-to) + images/
```

## Commands

```
npm install
npm run typecheck                 # tsc --noEmit
npm test                          # vitest
npm run dev                       # wrangler dev (needs .dev.vars)
npx wrangler deploy --env=""      # production deploy
npm run db:local                  # apply migrations to local D1
npm run db:remote                 # apply migrations to remote D1
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
  Uploads and OpenRouter gens are auto-confirmed; demos may invent social proof —
  real client builds must not.
- **Generated sites** must hit Lighthouse 90+, WCAG 2.1 AA, semantic HTML,
  mobile-first — governed by the `frontend-design` skill. Prefer composition
  recipes over freeform AI HTML/CSS (ADR-0020).

## Escalate to Jeremy before

Any paid API signup, spend beyond ~$5/mo Cloudflare + Anthropic/OpenRouter usage,
Facebook Graph API app registration, or custom domain purchases.
