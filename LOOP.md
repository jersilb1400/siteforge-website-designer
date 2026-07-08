# LOOP.md — SiteForge Autonomous Build Loop

This file drives an autonomous, multi-iteration build of **SiteForge** (AI website
design & creation app on Cloudflare Workers + Hono + TypeScript, with D1/R2/KV/Queues,
Browser Rendering, and the Anthropic API). Single operator: **Jeremy**.

Read this file at the start of every iteration. It is the contract for how you work.

---

## OBJECTIVE

Advance SiteForge **phase by phase to a deployable v1**, per the build plan in the
project brief. Phases 0 and 1 are already built and typecheck-clean this session.
Your job is to carry the remaining phases to "verified working":

- **Phase 2 — Ingestion Pipeline**: Browser Rendering scrape worker + Queues, website
  extractor, Facebook tiered ingestion (Graph API / best-effort scrape / manual
  fallback), R2 asset pipeline, client review/confirm UI. Deliverable: paste a URL,
  get reviewed structured content in `source_content`.
- **Phase 3 — Generation Engine**: 6–10 theme library templates (frontend-design
  standards), Claude generation pipeline, static bundle assembly to R2, preview
  deploys. Deliverable: interview + ingestion → live preview site.
- **Phase 4 — Revision & Production Deploy**: natural-language revision loop, build
  versioning + one-click rollback, production deploy flow, Lighthouse/accessibility
  automated checks as build gates.
- **Phase 5 — Polish & Extend**: custom domains (Cloudflare for SaaS), multi-tenant
  auth, MCP server exposure, optional billing hooks.

v1 is "done" when the success criteria in the brief hold: a new client can go from
first interview question to a deployed preview in under 30 minutes; generated sites
score Lighthouse 90+ across Performance/Accessibility/Best-Practices/SEO; ingestion
extracts name/contact/hours + ≥5 usable images from a typical site; infra runs under
$10/mo at hobby scale; and any client site can be rebuilt/redeployed from stored state
with one command.

---

## PER-ITERATION CYCLE

Run this loop each iteration. Do not skip steps.

1. **Read `PROGRESS.md`.** It is the single source of truth for what is done, what is
   verified, and what is next. Trust it over your own memory.

2. **Pick the next task.** Take the top unblocked item from the current phase's TODO
   list. Do not pull work from a later phase. See the phase-gating rule below.

3. **Implement.** Make the smallest coherent change that moves the task forward.
   Follow the existing codebase conventions:
   - Hono routes under `src/routes/`, mounted in `src/index.ts` under `/api`.
   - `Env` binding shape stays authoritative in `src/types.ts`; keep it in sync with
     `wrangler.toml`. Add new `IngestJob` variants there when adding job kinds.
   - D1 access through `src/lib/db.ts` helpers; new tables via a numbered migration in
     `migrations/` (next is `0002_*.sql`) — never edit `0001_init.sql` in place.
   - Anthropic calls through `src/lib/anthropic.ts` using `models(env)` from
     `src/lib/config.ts` (SMART for generation/follow-ups, CHEAP for classification).
   - Secrets only via `ANTHROPIC_API_KEY` / `OPERATOR_TOKEN` bindings — never inline.
   - Production-grade error handling and logging from the start; comments explain *why*.

4. **Verify with real commands.** A task is not done until it runs. Minimum gate:
   ```
   npm run typecheck                     # tsc --noEmit — must be clean
   npm test                              # vitest run — must pass
   npx wrangler deploy --dry-run         # build/bundle must succeed
   ```
   Deeper verification per phase:
   - Local runtime: `npm run dev` then hit the endpoint you changed
     (e.g. `curl localhost:8787/api/health`, `/api/ready`, your new route).
   - D1 migrations: `npm run db:local` applies cleanly before you rely on new tables.
   - Phase 2: enqueue a scrape, confirm the consumer writes `source_content` /
     `job_log`, confirm assets land in R2 under a sane key and are indexed in `assets`.
   - Phase 3+: build a bundle, open the preview URL, confirm real content (no lorem
     ipsum ever reaches a preview).
   - Phase 4: run the Lighthouse/a11y gate and record scores in `builds.lighthouse_json`.
   Record the exact commands you ran and their results in `PROGRESS.md`.

5. **Adversarial review (five lenses).** Before marking anything complete, run the
   `reviewer` subagent (`.claude/agents/reviewer.md`) on the diff, and apply all five
   review lenses to the deliverable:
   - **Advisor** — is this the right approach for SiteForge's goals and constraints?
   - **Adversarial** — how does this break? attacker, malformed input, hostile scrape.
   - **Code Expert** — correctness, types, Cloudflare/D1/Queues/R2 idioms, edge cases.
   - **Business Director** — does it serve the v1 success criteria and cost ceiling?
   - **Testing** — is it actually exercised end-to-end, not just typecheck-green?
   The reviewer returns findings ranked by severity and a GO / NO-GO verdict. On
   **NO-GO** or any unresolved High/Critical finding: fix and re-review. Do not proceed.

6. **Update `PROGRESS.md`.** Move the task to done, note what was verified and how,
   log a dated session entry, and refresh "Known gaps / next actions". Then loop.

---

## PHASE-GATING RULE

**Do not start a phase until the prior phase's deliverable is verified working.**
"Verified" means the deliverable was actually run (deployed or exercised locally
against real bindings), its acceptance check passed, and the `reviewer` returned GO.
Typecheck-clean alone is **not** verified. If the prior deliverable cannot be verified
because it depends on something only Jeremy can provide (see escalation), STOP and
escalate rather than skipping ahead.

---

## STOP CONDITIONS

Halt the loop and hand back to Jeremy when any of these is true:

- **Phase deliverable unverifiable without human/paid action** — e.g. Phase 0's real
  `wrangler deploy` needs Jeremy's Cloudflare credentials and provisioned binding IDs;
  Browser Rendering / production deploys need the Workers Paid plan.
- **An escalation trigger is hit** (see below).
- **Two consecutive iterations fail the verify gate** on the same task without net
  progress — you are stuck; write down the blocker and stop.
- **The reviewer returns NO-GO twice** on the same change after remediation attempts.
- **A change would exceed the cost ceiling** (~$5/mo Cloudflare + Anthropic usage, $10/mo
  infra total at hobby scale) or require a locked-stack substitution.
- **All phases 2–5 are verified done** and v1 success criteria hold — report completion.

When you stop, write a clear STOP entry in `PROGRESS.md`: why you stopped, exact state,
and the precise action needed to unblock.

---

## ESCALATE TO JEREMY (never self-approve these)

- Any **paid API signup** or plan upgrade.
- Any **spend beyond ~$5/mo Cloudflare** (Workers Paid) **+ Anthropic API usage**, or
  total infra over the **$10/mo** hobby ceiling.
- **Facebook Graph API app registration / app review** (Phase 2 Facebook tier a).
- **Custom domain purchases** or Cloudflare for SaaS setup (Phase 5).
- Provisioning real Cloudflare resources under Jeremy's account (D1/KV/R2/Queues IDs)
  and setting `wrangler secret` values (`ANTHROPIC_API_KEY`, `OPERATOR_TOKEN`).
- Any deviation from the locked tech stack, or publishing scraped content that has not
  passed client review.

Escalate by writing the ask into `PROGRESS.md` under "Known gaps / next actions" and
stopping the affected track. Continue on any other unblocked track if one exists.

---

## GUARDRAILS

- **Content ethics**: scraped/ingested content is always client-reviewed
  (`source_content.review_status = confirmed`) before it can reach a generated site.
  Never scrape behind logins; respect robots.txt for third-party sites that are not the
  client's own property. Present best-effort Facebook scrapes as unreliable, never
  authoritative.
- **Secrets** live only in Wrangler secrets / `.dev.vars` (gitignored). Never commit
  them; never write them into docs, code, or `wrangler.toml` (binding IDs there are not
  secret, but keys are).
- **No git commits** from the loop unless Jeremy asks. Leave the working tree for review.
- Keep `PROGRESS.md` honest — it is what the next session and Jeremy trust.
