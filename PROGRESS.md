# PROGRESS.md — SiteForge Build Log

Living progress log for the SiteForge autonomous build loop (see `LOOP.md`).
Single operator: **Jeremy**. Stack: Cloudflare Workers + Hono + TypeScript, with
D1 / R2 / KV / Queues / Browser Rendering / Workers AI + the Anthropic API.

**Update this file every iteration.** It is the single source of truth for what is
done, what is *verified*, and what is next.

---

## Status at a glance

| Phase | Title | State |
|---|---|---|
| 0 | Foundation | **Implemented & locally verified.** `tsc` clean, `wrangler deploy --dry-run` bundles all bindings, `wrangler dev` serves `/api/health` + `/api/ready` (D1+KV live). Real production `wrangler deploy` pending Jeremy's Cloudflare credentials + provisioned binding IDs. |
| 1 | Interview Engine | **Implemented & verified end-to-end** against local D1 via `wrangler dev` (create project → 20-question adaptive interview → structured JSON profile; status advanced to `ingesting`; resume is idempotent). Only AI *enrichment* (industry page suggestions, thin-answer follow-ups) is unverified, pending a live `ANTHROPIC_API_KEY`. |
| 2 | Ingestion Pipeline | **Implemented & locally verified.** URL → queue → HTMLRewriter extract → R2 images → normalized `source_content` → confirm/reject gate, verified end-to-end in `wrangler dev`. Browser Rendering path is a documented stub (paid plan); fetch fallback ships. |
| 3 | Generation Engine | TODO |
| 4 | Revision & Production Deploy | TODO |
| 5 | Polish & Extend | TODO |

Legend: "Implemented" = code written and `tsc --noEmit` clean. "Verified" = actually
run against real bindings, acceptance check passed, reviewer returned GO. Per the
phase-gating rule, Phase 2 does not start until Phase 0 + 1 are **verified** (which
requires Jeremy's Cloudflare account — see escalation below).

---

## Phase 0 — Foundation  ✅ implemented (verification pending Cloudflare creds)

Deliverable (brief): `wrangler deploy` works with a hello-world API.

Built this session:
- Workers + Hono app scaffold: `src/index.ts` mounts `/api/*`, falls through to static
  assets (`ASSETS` binding) for the dashboard/preview, JSON error handler, per-request
  id middleware, `hono/logger` + `secure-headers`.
- Binding surface declared in `wrangler.toml` and mirrored authoritatively in
  `src/types.ts` `Env`: `DB` (D1), `KV`, `R2`, `INGEST_QUEUE` (+ consumer/DLQ),
  optional `AI` (Workers AI) and `BROWSER` (Browser Rendering), `ASSETS`.
- D1 schema `migrations/0001_init.sql`: `clients`, `projects`, `interview_sessions`,
  `interview_answers`, `source_content`, `assets`, `builds`, `job_log` (with indexes
  and the client-review gate `source_content.review_status`).
- Health/readiness endpoints: `GET /api/health` (liveness) and `GET /api/ready`
  (touches D1 + KV and reports `ANTHROPIC_API_KEY` presence).
- Deploy scripting via npm scripts (`dev`, `deploy`, `db:local`, `db:remote`,
  `typecheck`, `test`, `cf-typegen`); secrets templated in `.dev.vars.example`.
- Queue wiring: producer/consumer configured; `src/queue/consumer.ts` records jobs to
  `job_log` and ack/retries so producer→queue→consumer→D1 is verifiable in Phase 2.

Verification done: `tsc --noEmit` clean this session.
Verification **pending** (blocked on Jeremy): real `wrangler deploy` and a live hit of
`/api/health` + `/api/ready` against deployed bindings — needs a Cloudflare login and
real D1/KV/R2/Queue IDs replacing the `PLACEHOLDER_*` values in `wrangler.toml`.

## Phase 1 — Interview Engine  ✅ implemented (end-to-end run pending)

Deliverable (brief): complete an interview end-to-end and see structured JSON output.

Built this session:
- Adaptive interview engine: `src/interview/engine.ts` + `src/interview/questions.ts`
  (smart follow-ups driven by prior answers, not a flat form).
- API routes: `src/routes/interview.ts` (mounted at `/api/interview`) and
  `src/routes/projects.ts` (`/api/projects`, operator-gated).
- Persistence in D1: `interview_sessions` (resumable via `phase` + `next_question_id`)
  and `interview_answers` (JSON `value_json`, upsert on `(session_id, question_id)`,
  `source` = user | ai).
- Operator auth middleware `src/middleware/auth.ts`: `OPERATOR_TOKEN` via Bearer header
  or `sf_operator` cookie, constant-time compare, **fails closed** when unset.
- Anthropic client `src/lib/anthropic.ts` with SMART/CHEAP model routing from
  `src/lib/config.ts`.
- Minimal web UI intended under `public/` (served via `ASSETS`).

Verification done: `tsc --noEmit` clean this session.
Verification **pending**: run `npm run db:local`, `npm run dev`, create a project, walk
an interview to completion, and confirm structured JSON output. Needs a live
`ANTHROPIC_API_KEY` in `.dev.vars` for the adaptive follow-up calls.

---

## Phase 2 — Ingestion Pipeline  ✅ implemented & locally verified

Deliverable: paste a URL → get reviewed, structured content in `source_content`. **Met.**
- [x] Scrape worker driven by `INGEST_QUEUE`; `src/queue/consumer.ts` dispatches by
      `IngestJob.kind` with ack/retry → DLQ.
- [x] Website extractor (`src/ingest/extract.ts`) via Workers HTMLRewriter: business
      name, meta/OG, headings, contact details (`contact.ts`), socials, candidate color
      palette ranked brand-over-neutral (`color.ts`).
- [x] Image pipeline (`src/ingest/assets.ts`): download to R2 under project-scoped keys
      (`projects/<id>/scraped/<assetId>.<ext>`), size/count/mime guards, indexed in `assets`.
- [x] Renderer with graceful degradation (`src/ingest/render.ts`): fetch path (default,
      deployable) + Browser Rendering upgrade seam gated by `USE_BROWSER_RENDERING`;
      robots.txt honored for non-client properties (client's own site bypasses).
- [x] Facebook tiered ingestion (`pipeline.ts`): (a) Graph API [later — ESCALATE: app
      review], (b) best-effort public scrape marked low-confidence, (c) manual fallback.
      Verified: an un-scrapable page degrades to the `manual` tier, never oversold.
- [x] Google Business: best-effort public listing else manual fallback.
- [x] Review API + operator UI: `PATCH /api/source-content/:id` gate; dashboard shows
      each source with confidence + Confirm/Reject. Nothing is used until
      `review_status` is `confirmed`/`edited`.
- [x] **Verified end-to-end** in `wrangler dev`: ingest a fixture URL → queue → extract →
      3 images stored in R2 → normalized `source_content` (name/email/phone/address/
      socials/palette) → confirm/edit gate. 9 ingest unit tests green (18 total).

**Browser Rendering caveat:** the real Browser Rendering path (`renderWithBrowser`) is a
documented stub — it needs the paid Workers plan + `@cloudflare/puppeteer`, which can't be
exercised in this environment. The fetch fallback covers server-rendered sites; JS-heavy
sites need the seam implemented + `USE_BROWSER_RENDERING=true`.

## Phase 3 — Generation Engine  ⬜ TODO

Deliverable: interview + ingestion → live preview site.
- [ ] Theme library: 6–10 base templates to frontend-design standards (semantic HTML5 +
      Tailwind + vanilla JS; no heavy frameworks in client output).
- [ ] Claude generation pipeline: template + palette + typography + real copy + images →
      static bundle; snapshot inputs in `builds.spec_json` for reproducible rebuilds.
- [ ] Bundle assembly to R2 (`builds.bundle_r2_key`) + preview deploy
      (`preview-{id}.siteforge.workers.dev`).
- [ ] Guard: no lorem ipsum ever reaches a preview.
- [ ] Verify: run interview→ingestion→generate, open the preview URL, reviewer → GO.

## Phase 4 — Revision & Production Deploy  ⬜ TODO

Deliverable: NL revision loop + versioned production deploy with quality gates.
- [ ] Natural-language revision loop ("make the header darker") → regenerate the diff.
- [ ] Build versioning (`builds.version`, unique per project) + one-click rollback.
- [ ] Production deploy flow via Wrangler (scripted, never dashboard clicks).
- [ ] Automated Lighthouse + WCAG 2.1 AA checks as **build gates**; store scores in
      `builds.lighthouse_json`; block deploy under 90.
- [ ] Verify: revise, redeploy, rollback, gate a failing build; reviewer → GO.

## Phase 5 — Polish & Extend  ⬜ TODO

Deliverable: productization hooks.
- [ ] Custom domains via Cloudflare for SaaS [ESCALATE: domain purchase / zone setup].
- [ ] Multi-tenant auth (replace `OPERATOR_TOKEN` single-operator model / Cloudflare
      Access) [ESCALATE if paid].
- [ ] MCP server exposure (mcp-builder) so other Claude sessions can trigger builds.
- [ ] Optional billing hooks if productized [ESCALATE].

---

## Known gaps / next actions

These are the things blocking verification. Several require **Jeremy** (see `LOOP.md`
escalation triggers):

1. **Provision real Cloudflare binding IDs** [Jeremy]: create D1 `siteforge-db`, the KV
   namespace, R2 `siteforge-assets`, and Queues `siteforge-ingest` (+ DLQ) under
   Jeremy's account, then replace `PLACEHOLDER_D1_DATABASE_ID` /
   `PLACEHOLDER_KV_NAMESPACE_ID` in `wrangler.toml`.
2. **Set secrets** [Jeremy]: `wrangler secret put ANTHROPIC_API_KEY` and
   `wrangler secret put OPERATOR_TOKEN` (long random string). Locally, copy
   `.dev.vars.example` → `.dev.vars` (gitignored) with real values.
3. **First real deploy** [Jeremy-gated]: `npm run db:remote` then `npm run deploy`;
   hit `/api/health` and `/api/ready` to verify Phase 0 for real.
4. **Verify Phase 1 end-to-end** locally: `npm run db:local`, `npm run dev`, walk an
   interview to structured-JSON completion (needs the key from #2).
5. **Wire Browser Rendering** [Phase 2 start]: the `BROWSER` binding is declared but
   unused; requires the Workers Paid plan [ESCALATE for plan spend]. Also confirm
   Queues availability on the plan.
6. **Cost watch**: keep infra under $10/mo hobby ceiling; Browser Rendering, Queues,
   and production Workers may cross the ~$5/mo Cloudflare line — escalate before enabling.

---

## Session log

### 2026-07-08 — Foundation + Interview + loop setup
- Phase 0 scaffolded and typecheck-clean: Hono app, `Env`/bindings, `0001_init.sql`
  schema, health/ready endpoints, queue wiring, deploy scripts.
- Phase 1 implemented and typecheck-clean: adaptive interview engine + API routes +
  D1 persistence + operator auth + Anthropic model routing.
- Configured the autonomous build loop: `LOOP.md`, this `PROGRESS.md`, the `reviewer`
  adversarial subagent (`.claude/agents/reviewer.md`), `.claude/settings.json`
  permissions, and `.claude/agents/README.md` (role + model-routing guide).
- **Not yet verified against live Cloudflare**: real `wrangler deploy` and end-to-end
  interview run are blocked on Jeremy's credentials/secrets (see Known gaps 1–4).
- **Next iteration**: once #1–#4 clear, verify Phases 0 + 1 for real; only then begin
  Phase 2 (Ingestion) per the phase-gating rule.
