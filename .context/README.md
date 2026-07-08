# .context — SiteForge project knowledge layer

This directory is the durable memory for the SiteForge codebase. It exists so any
session — human or agent — can get grounded in the project's mission, architecture,
decisions, and verification rules without re-deriving them from scratch or guessing.

## The rule

**Read this layer first, before touching code.** Start with `mission.md` and
`architecture.md`, then consult the file relevant to your task. When you make a
decision that changes direction, record it in `decisions.md`. When a fact here
goes stale, fix it in the same change that made it stale — this layer is only
useful if it stays true.

## What's here

| File | What it holds |
|---|---|
| `mission.md` | Why SiteForge exists, who it serves, v1 success criteria (the concrete numbers). |
| `architecture.md` | Cloudflare stack, every binding and why, request flow, interview engine, ingestion pipeline. Points at real file paths. |
| `decisions.md` | ADR log — the locked and deliberate choices, with context and consequences. |
| `domain.md` | Glossary and data model in plain language: client, project, interview, source_content, asset, build, job, and their lifecycle status values. |
| `verification.md` | How to prove each phase's deliverable actually works — the "verify before done" rule, the five-lens review, and concrete commands. |

Companion `docs/` holds reference material: `phases.md` (the 0–5 build plan and
status), `data-model.md` (D1 tables in detail), and `api.md` (the HTTP API as built).

## Ground truth precedence

The running code and `migrations/` are the ultimate source of truth. This layer
explains and organizes that truth; where they disagree, the code wins and this
layer is wrong and should be corrected. The original project brief
(`siteforgeprojectprompt.md`, provided at kickoff) is the source of truth for
mission, locked tech-stack decisions, phases, and operating rules.
