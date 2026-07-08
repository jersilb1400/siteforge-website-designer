# Verification

The operating rule from the brief: **verify before "done."** Every phase deliverable
must actually run — deploy it, hit the endpoint, see the output. No phase starts until
the previous phase's deliverable is verified working. Update `PROGRESS.md` after every
session.

## The five-lens review

Before marking anything complete, review it through five lenses:

- **Advisor** — Does this serve the mission and the v1 success criteria? Is it the
  right thing to build now?
- **Adversarial** — How does this break? Missing token, empty answer, AI down,
  malformed URL, unreviewed scraped content, retry storms. Try to break it.
- **Code Expert** — Is it idiomatic, typed, and consistent with the existing
  patterns (`lib/db`, `lib/errors`, `lib/id`, Hono route modules)? Production-grade
  error handling and logging from day one?
- **Business Director** — Cost (Anthropic model routing, Cloudflare limits), operator
  ergonomics, and the content-ethics/copyright gate.
- **Testing** — What proves it works? Commands run, outputs observed, edge cases
  exercised — not just "it compiles."

## Baseline checks (every change)

```bash
npm run typecheck                 # tsc --noEmit — must be clean
npx wrangler deploy --dry-run     # config + bindings + bundle validate without deploying
npm test                          # vitest (unit tests for pure engine functions)
```

The interview engine is intentionally pure (`nextQuestion`, `progress`,
`buildProfile`, `parseAnswers`) so its logic is testable without a network or bindings.

## Local run

```bash
# Apply migrations to the local D1 database, then run the Worker locally.
npm run db:local                  # wrangler d1 migrations apply siteforge-db --local
npm run dev                       # wrangler dev  (serves http://localhost:8787)
```

For operator routes, set `OPERATOR_TOKEN` (and `ANTHROPIC_API_KEY` for AI enrichment)
in `.dev.vars` — copy from `.dev.vars.example`. Never commit `.dev.vars`.

## Phase 0 — foundation deliverable

Goal: `wrangler deploy` works and a hello-world API responds.

```bash
# Liveness — no bindings touched:
curl -s http://localhost:8787/api/health
# -> {"ok":true,"service":"siteforge","environment":"development","time":"..."}

# Readiness — actually touches D1 + KV and checks the Anthropic secret:
curl -s http://localhost:8787/api/ready
# -> {"ok":true,"checks":{"d1":"ok","kv":"ok","anthropic":"ok"}}
# 503 if any check fails (e.g. anthropic:"error" when ANTHROPIC_API_KEY is unset).
```

`/api/ready` returning `ok:true` is the concrete proof the deploy is wired end to
end (D1 reachable, KV reachable, secret present).

## Phase 1 — interview engine deliverable

Goal: complete an interview end to end and see structured JSON output.

```bash
TOKEN=your-operator-token
BASE=http://localhost:8787

# 1. Operator creates a client + project + interview session in one call:
curl -s -X POST $BASE/api/projects \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"clientName":"Grace Fellowship","contactEmail":"office@grace.example","projectName":"Grace site"}'
# -> { "project": {...}, "interviewSessionId": "sess_...", "interviewUrl": "/interview.html?s=sess_..." }

SID=sess_...   # from the response above

# 2. Client fetches the current state / next question (no operator token — session id gates it):
curl -s $BASE/api/interview/$SID
# -> { "progress":{"answered":0,"total":N}, "complete":false, "question":{ "id":"business_name", ... } }

# 3. Client answers a question; response returns the next one. Repeat until complete:
curl -s -X POST $BASE/api/interview/$SID/answer \
  -H 'Content-Type: application/json' \
  -d '{"questionId":"business_name","value":"Grace Fellowship"}'
# -> { "saved":true, "followUp":null, "progress":{...}, "complete":false, "question":{...} }

# 4. Read the structured profile (the Phase 1 deliverable):
curl -s $BASE/api/interview/$SID/profile
# -> { "complete":true, "profile":{ "business":{...}, "goals":[...], "pages":[...], ... } }
```

Verify: required-answer validation rejects empty values (`400 bad_request`);
re-answering a question upserts (no duplicate rows); `skipIf` questions are skipped
(e.g. `donation_url` absent unless "Collect donations" is a goal); completing the
last question flips the session to `complete` and the project to `ingesting`;
`buildProfile` output matches the answers given.

Adversarial checks: unknown/missing `questionId` → 400; answering a completed session
→ 400; a bad or missing operator token on `/api/projects` → 401; unknown `/api/*`
route → JSON 404 (not a static-asset fallthrough).

## Later phases

- **Phase 2 (ingestion):** paste a URL, confirm a job lands in `job_log`, then that
  Browser Rendering produces `source_content` rows and R2 assets; verify nothing is
  usable until `review_status` is confirmed.
- **Phase 3 (generation):** interview + ingestion → a live preview URL; no lorem
  ipsum; `builds.spec_json` persisted.
- **Phase 4 (revision/deploy):** natural-language revision regenerates a diff;
  Lighthouse 90+ enforced as a build gate (`lighthouse_json`); one-command rebuild
  from stored state; one-click rollback to a prior `builds.version`.
