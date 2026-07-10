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

## ADR-0012 — Interview Back + Finish UX

- **Status:** Accepted (2026-07-09)
- **Context:** Clients need to correct prior answers; completion felt abrupt with no Finish/Done CTA.
- **Decision:** Add `POST /api/interview/:sessionId/back` (remove most-recent answer, re-present that question). Client shows Back when history exists; last-step CTA is Finish; completion screen has an explicit Done acknowledgment.
- **Consequences:** Session can leave `complete` if user backs from a finished state only via operator reset later — Back is only available while `active` or by un-completing when deleting the last answer. Prefer: Back while active; on complete screen, Done closes the loop without mutating.

## ADR-0013 — Premium demo design bar (Editorial Luxury)

- **Status:** Accepted (2026-07-09)
- **Context:** First spa demos were too simple to pitch prospects. Installed high-end-visual-design, ui-ux-pro-max, impeccable skills.
- **Decision:** Haven (and demo-facing themes) target Editorial Luxury: brand-first full-bleed/centered hero, film-grain atmosphere, nested service treatments, springy motion, no Inter/Roboto as display. Still semantic HTML + inline CSS (no heavy client frameworks) for Lighthouse 90+.
- **Consequences:** Richer CSS in themes; section HTML may gain optional demo-friendly hooks (e.g. atmosphere wrappers) without breaking existing themes.
## ADR-0010 — Sales demos as real projects

- **Status:** Accepted (2026-07-09)
- **Context:** Operators need fast prospect pitches without a full interview.
- **Decision:** `POST /api/demos` creates a real client/project named `Demo — {name}`, seeds interview answers + confirmed catalog `source_content`, then runs `generateBuild`.
- **Consequences:** Demos appear in the dashboard with revise/publish; Day spa / Salon + Haven theme added.

## ADR-0012 — Interview Back + Finish UX

- **Status:** Accepted (2026-07-09)
- **Context:** Clients need to correct prior answers; completion felt abrupt with no Finish/Done CTA.
- **Decision:** Add `POST /api/interview/:sessionId/back` (delete most-recent answer by updated_at, re-present that question; if session was complete, set status back to active). Client shows Back when answers exist; last unanswered question's primary CTA is Finish; completion screen has explicit Done.
- **Consequences:** Back can un-complete a session so the client can revise.

## ADR-0013 — Premium demo design bar (Editorial Luxury)

- **Status:** Accepted (2026-07-09)
- **Context:** First spa demos were too simple to pitch. Installed high-end-visual-design, ui-ux-pro-max, impeccable (+ existing frontend-design).
- **Decision:** Haven targets Editorial Luxury: brand-first hero, grain atmosphere, nested service shells, springy motion; still semantic HTML + inline CSS for Lighthouse 90+.
- **Consequences:** Richer theme CSS; optional section hooks for atmosphere without breaking other themes.

## ADR-0014 — context-architect now available

- **Status:** Accepted (2026-07-09) — supersedes the "missing skill" part of ADR-0009
- **Context:** `context-architect` is installed; `.context/` already existed in SiteForge layout.
- **Decision:** Keep existing `.context/*` files; add VERIFY.md for task checks; append ADRs rather than renaming the whole tree to CONTEXT.md/DECISIONS.md.
- **Consequences:** Dual naming (mission.md vs CONTEXT.md) is fine; VERIFY.md is the live check index.
