# Decision log (ADRs)

Architecture Decision Records for SiteForge. Each entry is immutable once
Accepted; to change a decision, add a new ADR that supersedes it. Format:
Number, Title, Status, Context, Decision, Consequences.

---

## ADR-0001 — Cloudflare-only stack

- **Status:** Accepted (locked by project brief — do not substitute without escalating to Jeremy)
- **Context:** SiteForge must run cheaply (infra under $10/mo at hobby scale) for a
  single operator, and needs compute, static hosting, a database, object storage,
  a cache, a job queue, and headless browser scraping.
- **Decision:** Build entirely on Cloudflare: Workers (compute/API), Workers Static
  Assets (hosting), D1 (database), R2 (object storage), KV (cache/sessions),
  Queues (jobs), Browser Rendering (scraping), Workers AI (cheap fallback).
  Anthropic API for the intelligence. Wrangler for all deploys — never manual
  dashboard clicks.
- **Consequences:** One account, one bill, one deploy tool; no egress fees on R2.
  Locks us to Cloudflare's runtime constraints (Workers CPU limits, no long-lived
  processes — hence Queues for async work). The stack table in the brief is
  authoritative.

## ADR-0002 — Hono as the Worker framework

- **Status:** Accepted
- **Context:** The Worker needs routing, middleware, and typed context over the raw
  `fetch` handler without pulling in a heavy framework.
- **Decision:** Use Hono. A single app in `src/index.ts` composes route sub-apps
  (`health`, `projects`, `interview`) under `/api`, with request-id, logger, and
  secure-headers middleware, a global typed-error handler, and a static-assets
  catch-all.
- **Consequences:** Small, fast, Workers-native. Typed `Bindings`/`Variables`
  generics keep `Env` and request vars honest. Route modules stay thin over the
  `src/lib/db.ts` helpers.

## ADR-0003 — D1 with JSON columns for variable-shaped data

- **Status:** Accepted
- **Context:** Interview answers are heterogeneous (strings, lists of pages/socials,
  structured objects), and ingested/generation data is semi-structured. Modeling
  every shape as columns would be brittle.
- **Decision:** Use D1 (SQLite) for the relational backbone, but store
  variable-shaped payloads as JSON text columns: `interview_answers.value_json`,
  `source_content.data_json`, `builds.spec_json` / `lighthouse_json`,
  `job_log.detail_json`. Readers `JSON.parse`; decoding is centralized
  (`parseAnswers` in the engine, helpers in `src/lib/db.ts`).
- **Consequences:** One `interview_answers` table holds all answer types;
  `(session_id, question_id)` uniqueness makes re-answers a clean upsert. Trade-off:
  JSON columns aren't directly queryable/indexable — acceptable because we query by
  keys (project/session), not by answer contents.

## ADR-0004 — App-generated, time-sortable IDs

- **Status:** Accepted
- **Context:** We want primary keys that sort by creation time (for cheap
  chronological ordering) and are self-describing in logs and URLs, without an
  auto-increment sequence or a separate timestamp index.
- **Decision:** Generate IDs in the app (`src/lib/id.ts`): an 8-char base36 ms
  timestamp + 12 chars of crypto-random base36, optionally prefixed (`proj_`,
  `sess_`, `ans_`, `client_`, `job_`, `req`). ULID-ish — same
  lexicographic-order-tracks-time property, not a full ULID.
- **Consequences:** Rows sort chronologically by PK; IDs are greppable by type.
  Session ids double as unguessable capability tokens for the client interview
  link (see ADR-0005). Slight modulo bias in the random suffix is irrelevant at
  this length.

## ADR-0005 — Operator-token auth for v1

- **Status:** Accepted (interim — superseded later by Cloudflare Access)
- **Context:** v1 is a single operator (Jeremy). Full auth (magic-link,
  multi-tenant) is out of scope now, but operator routes must not be open.
- **Decision:** Operator-only routes (`/api/projects*`) require a shared
  `OPERATOR_TOKEN` via `Authorization: Bearer <token>` or an `sf_operator` cookie
  (`src/middleware/auth.ts`), compared constant-time-ish. Fail closed: an unset
  token means "deny everyone", not "open". Client interview routes
  (`/api/interview/*`) are instead gated by possession of the unguessable session
  id — the operator hands a client their link and they self-serve.
- **Consequences:** Simple and adequate for one operator. The session-id-as-token
  model means links must be treated as secrets. Cloudflare Access / magic-link
  replaces the operator token in a later phase.

## ADR-0006 — Two-tier model routing (smart / cheap)

- **Status:** Accepted
- **Context:** Some tasks (content generation, adaptive follow-ups) want a capable
  model; high-volume classification/suggestion tasks should be cheap to protect the
  Anthropic bill.
- **Decision:** Route by task via `src/lib/config.ts` `models(env)`:
  `smart = claude-sonnet-5`, `cheap = claude-haiku-4-5-20251001`. Defaults live in
  `wrangler.toml [vars]` (`ANTHROPIC_MODEL_SMART` / `ANTHROPIC_MODEL_CHEAP`) and are
  overridable per environment. Workers AI is the even-cheaper fallback for pure
  classification (Phase 2+). Model ids are never hardcoded outside config.
- **Consequences:** Interview enrichment (`resolveOptions`, `maybeFollowUp`) uses
  the cheap model and fails open. Swapping models is a config change, not a code
  change.

## ADR-0007 — Placeholder binding IDs until provisioned

- **Status:** Accepted
- **Context:** `wrangler.toml` needs concrete resource IDs to deploy, but those are
  created under a real Cloudflare login the scaffolding session doesn't perform.
- **Decision:** Ship `wrangler.toml` with placeholder IDs
  (`PLACEHOLDER_D1_DATABASE_ID`, `PLACEHOLDER_KV_NAMESPACE_ID`). Provision resources
  with the `wrangler ... create` commands (or a `setup.sh`) and paste the returned
  IDs. IDs are not secret; API keys are and live in Wrangler secrets.
- **Consequences:** The repo is reviewable and typechecks before any Cloudflare
  resources exist. A real deploy requires the provisioning step first.

## ADR-0008 — frontend-design skill governs all UI output

- **Status:** Accepted (locked by brief)
- **Context:** The core value is professional-looking sites; generic AI-template
  output would sink the product.
- **Decision:** The `frontend-design` skill governs every generated website and the
  SiteForge dashboard UI. Every template must pass its bar (intentional typography,
  distinctive-but-professional aesthetics, no generic look) plus the non-negotiables
  (Lighthouse 90+, WCAG 2.1 AA, semantic HTML, mobile-first, OG + JSON-LD, no heavy
  JS frameworks). Load its SKILL.md before producing UI. Applies from Phase 3 on.
- **Consequences:** UI work is gated on that skill's standards, not ad-hoc taste.

## ADR-0009 — Manual substitutes for unavailable bootstrap skills

- **Status:** Accepted
- **Context:** The brief calls for `context-architect`, `project-bootstrapper`, and
  `agentic-loop-setup` skills. These are **not installed in this remote
  environment.** The brief's rule: if a skill is missing, say so and substitute the
  closest manual equivalent — do not silently skip.
- **Decision:** Substitute manual equivalents. This `.context/` layer + `docs/`
  folder stand in for `context-architect`. The scaffold and phase plan
  (`docs/phases.md`) stand in for `project-bootstrapper`'s output. The agentic loop
  (LOOP.md / PROGRESS.md / reviewer subagent) is deferred until `agentic-loop-setup`
  is available or built by hand.
- **Consequences:** Project knowledge is captured in files under version control
  instead of skill-managed structure. If those skills later become available,
  reconcile this layer with their conventions.
