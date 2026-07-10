# PROGRESS.md — SiteForge Build Log

Living progress log for the SiteForge autonomous build loop (see `LOOP.md`).
Single operator: **Jeremy**. Stack: Cloudflare Workers + Hono + TypeScript, with
D1 / R2 / KV / Queues / Browser Rendering / Workers AI + Anthropic + OpenRouter.

**Update this file every iteration.** It is the single source of truth for what is
done, what is *verified*, and what is next.

**Production:** `https://websiteforge.cc` · Worker `https://siteforge.jersilb.workers.dev`
Branch: `claude/build-plan-review-implement-h0z0k9`

---

## Status at a glance

| Phase | Title | State |
|---|---|---|
| 0 | Foundation | **Production verified.** Live Worker + D1/KV/R2/Queues/ASSETS; `/api/health` + `/api/ready` OK. |
| 1 | Interview Engine | **Production verified.** Adaptive interview, resume, operator auth, Anthropic enrichment. |
| 2 | Ingestion Pipeline | **Implemented & verified.** Fetch + HTMLRewriter → R2 → review gate. Browser Rendering still stub (paid). |
| 3 | Generation Engine | **Production verified + quality upgrade (2026-07-10).** 8 themes, 6 composition recipes, multi-page sites, OpenRouter FLUX photos, uploads, design director, critique loop, sales demos. ADR-0020. |
| 4 | Revision & Production Deploy | **Production verified.** NL revise, versioned builds, publish/rollback, `/preview/` + `/site/`. Quality gate + Lighthouse 90+. |
| 5 | Polish & Extend | **MCP shipped.** Custom domains / multi-tenant / billing still escalation-gated. Operator chrome (forge UI + photography) live. |

Legend: "Implemented" = code written and `tsc --noEmit` clean. "Verified" = run against
real bindings with acceptance checks. "Production verified" = exercised on the live Worker.

### Latest quality proof (2026-07-10)

Five industry demos regenerated after ADR-0020 — all **quality score 100**, OpenRouter
photos (~$0.084 each), distinct compositions:

| Demo | Theme / recipe signal | Preview |
|---|---|---|
| Lumen Spa | Haven · editorial-luxury · FAQ | `/preview/build_mrf2uhbiurl3en1gi8na/` |
| Harbor Community Church | Sanctuary · visit + give pages | `/preview/build_mrf2vdo43eetpj7oxwsi/` |
| Ember & Oak | Storefront · reserve CTA | `/preview/build_mrf2w5db69x95gbtn737/` |
| TrueLine Builders | Forge · craft-trade · FAQ | `/preview/build_mrf2wyfsc129ahuu2ao2/` |
| Northfield Advisory | Atelier · team + FAQ | `/preview/build_mrf2xnopuk5bzbwjhots/` |

Smoke: brand-first heroes with photos, no “Learn more”, industry CTAs, testimonials,
sticky mobile CTA. Unit tests: **71 green**; `tsc` clean.

### Acceptance / user-simulation testing (2026-07-08)

Full simulation against `wrangler dev` (happy paths + adversarial + security + MCP):
**20/20 checks pass.** XSS escaped in previews; auth/validation fail closed; MCP tools
graceful on errors. Real Lighthouse on a published site: Perf 100 / A11y 94 / BP 96 / SEO 100.

---

## Phase 0 — Foundation  ✅ production verified

- Workers + Hono, typed `Env`, D1 migrations, health/ready, queue wiring, static ASSETS.
- Bindings provisioned; secrets set (`ANTHROPIC_API_KEY`, `OPERATOR_TOKEN`,
  `OPENROUTER_API_KEY`); production deploy routine.

## Phase 1 — Interview Engine  ✅ production verified

- Adaptive engine + question bank; D1 sessions/answers; operator token auth.
- Client UI: `public/interview.html` (forge chrome).

## Phase 2 — Ingestion Pipeline  ✅ verified (Browser Rendering stub)

- Queue consumer → HTMLRewriter extract → R2 assets → `source_content` review gate.
- Facebook/Google best-effort tiers; confirm/reject UI.
- Browser Rendering path remains a documented stub (`USE_BROWSER_RENDERING=false`).

## Phase 3 — Generation Engine  ✅ production verified

Deliverable: interview + ingestion → live multi-page preview. **Met.**

- [x] **8 themes:** atelier, sanctuary, storefront, ledger, meridian, forge, gallery, haven
- [x] **Composition recipes** (`src/generate/composition/`): editorial-luxury,
      warm-hospitality, reverent-sanctuary, clean-clinic, craft-trade, mission-ledger
- [x] Design director: curated fonts (no Inter body), signatures, palette, recipe pick
- [x] Multi-page render: home + about/services/gallery/contact + optional team/faq/give/visit
- [x] Conversion copy: industry voice, goal CTAs, testimonials/FAQ/team (demo-invented only)
- [x] Art-directed imagery: `SiteImage.role`; OpenRouter FLUX.2 Klein 4B slot fill;
      uploads → scrapes → AI → Unsplash fallback (ADR-0019)
- [x] Client uploads: logo + photos (`POST /api/projects/:id/uploads`) (ADR-0018)
- [x] Sales demos: `POST /api/demos` seeds project + generate in one click
- [x] Design critique loop + one fix pass (`critique.ts`); non-blocking design checks
- [x] Bundle in R2; `builds.spec_json` for rebuild; preview at `/preview/:buildId/`

## Phase 4 — Revision & Production Deploy  ✅ production verified

- NL revision loop; versioned builds; publish/rollback; `/site/:projectId/`
- In-worker quality gate + Lighthouse CI script; publish blocked unless pass (or `force`)

## Phase 5 — Polish & Extend  ◐ partial

- [x] MCP server (`POST /mcp`) — operator-gated tools
- [x] SiteForge operator chrome: blacksmith forge UI + photography (`public/`)
- [ ] Custom domains (Cloudflare for SaaS) — **ESCALATE**
- [ ] Multi-tenant auth — v1 stays single-operator token
- [ ] Billing — **ESCALATE** if productized

---

## Known gaps / next actions

1. **Browser Rendering** — implement real puppeteer path when paid plan spend is OK.
2. **Custom domains** — Cloudflare for SaaS for client production hostnames.
3. **Multi-tenant auth** — replace operator token when productizing beyond Jeremy.
4. **Cost watch** — OpenRouter ~$0.08–0.12 per 6-image demo; Anthropic usage on generate/
   critique; keep infra under hobby ceiling or escalate.
5. **Industry page depth** — more recipe variants / section recipes as prospect feedback lands.
6. **Real client path smoke** — full interview → ingest → generate (non-demo) to confirm
   invented testimonials stay off when `demo` is false.

---

## Session log

### 2026-07-08 — Foundation + Interview + loop setup
- Phase 0–1 scaffolded; autonomous loop (`LOOP.md`, reviewer agent) configured.

### 2026-07-09 — Production + demos + media
- Live deploy to Cloudflare; custom domain `websiteforge.cc`.
- Sales demos, multi-page sites, project delete, client uploads, OpenRouter imagery
  (ADR-0017–0019). Haven editorial-luxury demo bar.

### 2026-07-10 — Operator chrome + next-level site quality
- Forge photography on SiteForge chrome (gate, workshop ghost strike, how-to, interview).
- **ADR-0020:** composition recipes, role-assigned images, conversion copy, critique loop,
  theme CSS for new sections. Deployed; 5-industry demo battery quality 100.
- Unit tests 71 green.
