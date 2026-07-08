# SiteForge Agentic Loop — roles & model routing

This directory holds the subagents that run SiteForge's autonomous build loop. The loop
itself is defined in `../../LOOP.md`; the living state is in `../../PROGRESS.md`;
permissions for autonomous runs are in `../settings.json`.

## The loop in one screen

Each iteration: **read `PROGRESS.md` → pick the next task (current phase only) →
implement → verify with real commands → adversarial review → update `PROGRESS.md`**.
Phases advance 0→5, and no phase starts until the prior deliverable is *verified*
(run for real + reviewer GO), not merely typecheck-green. The loop stops and escalates
to Jeremy for paid signups, spend past ~$5/mo Cloudflare + Anthropic (or $10/mo infra),
Facebook Graph API app review, custom domains, or anything needing his Cloudflare creds.

## Roles

- **Builder / orchestrator** (the main loop session): reads state, plans the next task,
  writes code, runs the verify gate (`npm run typecheck`, `npm test`,
  `npx wrangler deploy --dry-run`, local `wrangler dev` hits), and keeps `PROGRESS.md`
  honest. Drives, but never self-approves an escalation.
- **`reviewer`** (`reviewer.md`): the adversarial gate. Read-only. Given a diff or a
  "done" claim, it hunts correctness bugs, security holes (secrets, fail-open auth,
  injection, unreviewed scraped content), and Cloudflare pitfalls (D1 binding misuse,
  queue ack/retry + idempotency, R2 key hygiene), then returns severity-ranked findings
  and a **GO / NO-GO** verdict. The builder must not mark a task done on a NO-GO or any
  unresolved High/Critical finding.

Alongside the reviewer, the builder applies the **five review lenses** before "done":
**Advisor** (right approach?), **Adversarial** (how does it break?), **Code Expert**
(correctness & CF idioms), **Business Director** (serves v1 goals + cost ceiling?),
**Testing** (exercised end-to-end?).

## Smart model routing

Match model cost to the cognitive load of the step. Cheaper models for mechanical work;
reserve Opus for judgment.

| Model | Use it for |
|---|---|
| **Haiku** | Cheap/mechanical steps: reading `PROGRESS.md`, running the verify commands and parsing results, formatting logs, small deterministic edits, classification/tagging. Mirrors `ANTHROPIC_MODEL_CHEAP` in the app. |
| **Sonnet** | The default implementation model: writing routes, migrations, the ingestion/generation pipelines, tests — most per-iteration coding. Mirrors `ANTHROPIC_MODEL_SMART`. |
| **Opus** | Architecture decisions, phase planning, and **adversarial review** (`reviewer` is pinned to `opus`). The high-stakes judgment calls where a miss is expensive. |

This mirrors the app's own routing: `models(env)` in `src/lib/config.ts` sends
generation/follow-ups to SMART (Sonnet) and classification to CHEAP (Haiku). Keep the
loop's model spend on the same discipline as the product's — it is part of the same
cost ceiling Jeremy is protecting.
