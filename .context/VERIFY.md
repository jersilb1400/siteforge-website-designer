# VERIFY — SiteForge task checks

Fast tier (every change): `npm run typecheck` · `npm test` · `npx wrangler deploy --dry-run`

## Interview navigation (Back + Finish)

How we know it works:
1. Mid-interview, **Back** returns to the previous question with the prior answer restorable or clear for re-entry.
2. First question: Back is disabled or hidden (no error).
3. Last question primary CTA reads **Finish** (not Continue); submitting completes the session.
4. Completion screen shows a clear **Done** / acknowledgment CTA (not a dead-end card only).
5. Re-opening a completed session still shows the completion state (idempotent).

Manual: create project → open interview link → answer 2 → Back → re-answer → finish → see Done.

## Premium sales demos (Haven / spa)

How we know it works:
1. Spa demo `h1` is the business name (brand-first).
2. First viewport: brand + one headline/sub + CTA + atmospheric background — no card clutter in hero.
3. Services look real (catalog names), not goal placeholders.
4. Theme CSS includes intentional motion (2–3) and no banned generic fonts as display (no Inter/Roboto as hero).
5. `npm test` demo suite green; quality gate still passes on rendered HTML.
6. Visual: Jeremy judges “would impress a spa owner” on `/preview/...` after `POST /api/demos`.

## Deploy gate

`curl https://siteforge.jersilb.workers.dev/api/health` and `/api/ready` → `ok:true` after deploy.
