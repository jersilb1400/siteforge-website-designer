# HTTP API

The SiteForge Worker owns `/api/*`; every other path falls through to static assets.
Source: `src/index.ts` and `src/routes/*.ts`.

## Conventions

- **Base:** `/api`. All responses are JSON.
- **Request id:** every response carries an `x-request-id` header (from `cf-ray` or
  generated) for log correlation; error bodies echo it as `requestId`.
- **Errors:** typed `AppError`s serialize uniformly (`src/lib/errors.ts`):

  ```json
  { "error": { "code": "not_found", "message": "project not found.", "detail": null }, "requestId": "…" }
  ```

  Codes: `bad_request` (400), `unauthorized` (401), `not_found` (404),
  `conflict` (409), `upstream_error` (502), `internal_error` (500). Unknown `/api/*`
  routes return JSON `404 not_found` (they do **not** fall through to static assets).

- **Auth, two schemes:**
  - **Operator** — required on `/api/projects*`. Send
    `Authorization: Bearer <OPERATOR_TOKEN>` (or an `sf_operator` cookie). Missing
    or wrong token → `401 unauthorized`. If `OPERATOR_TOKEN` is unset server-side,
    routes fail closed (also 401). See `src/middleware/auth.ts`.
  - **Session-id capability** — `/api/interview/*` routes are gated by possession of
    the unguessable session id in the URL, not the operator token. The operator
    hands a client their interview link; the client self-serves. An unknown session
    id → `404 not_found`.

---

## Health

### GET /api/health
Liveness ping. No auth. Touches nothing.

```json
{ "ok": true, "service": "siteforge", "environment": "development", "time": "2026-07-08T…Z" }
```

### GET /api/ready
Readiness. No auth. Actually exercises D1 (`SELECT 1`) and KV (a `get`), and checks
that the Anthropic secret is present. Returns `200` when all checks pass, `503`
otherwise.

```json
{ "ok": true, "checks": { "d1": "ok", "kv": "ok", "anthropic": "ok" } }
```

Each check is `"ok"` or `"error"`; `anthropic` is `"error"` when `ANTHROPIC_API_KEY`
is unset.

---

## Projects (operator only)

All routes below require the operator token.

### POST /api/projects
Create a client + project + interview session atomically (one D1 batch).

Request body:

```json
{ "clientName": "Grace Fellowship", "contactEmail": "office@grace.example", "projectName": "Grace site" }
```

- `clientName` — **required**; `400 bad_request` if missing/empty.
- `contactEmail` — optional.
- `projectName` — optional; defaults to `"<clientName> website"`.

Response `201`:

```json
{
  "project": { "id": "proj_…", "clientId": "client_…", "name": "Grace site", "status": "interview" },
  "interviewSessionId": "sess_…",
  "interviewUrl": "/interview.html?s=sess_…"
}
```

`interviewUrl` is the link the operator shares with the client to run the interview.

### GET /api/projects
List projects, most recent first (limit 100), each joined with its client name and
carrying a compact interview-progress readout.

```json
{ "projects": [ { "id": "proj_…", "client_id": "client_…", "client_name": "Grace Fellowship",
                  "name": "Grace site", "status": "interview", "industry": null, "tone": null,
                  "created_at": "…", "updated_at": "…" } ] }
```

### GET /api/projects/:id
Project detail: the project row, its most-recent interview session (id/status/phase),
and an interview progress snapshot. `404 not_found` if the project doesn't exist.

```json
{
  "project": { "id": "proj_…", "client_id": "client_…", "name": "…", "status": "interview",
               "industry": null, "tone": null, "created_at": "…", "updated_at": "…" },
  "session": { "id": "sess_…", "status": "active", "phase": "basics" },
  "interviewProgress": { "answered": 3, "total": 18 }
}
```

`session` and `interviewProgress` are `null` if no session exists yet.

---

## Interview (session-id gated)

No operator token. The session id in the path is the capability. Unknown session id →
`404 not_found`.

### GET /api/interview/:sessionId
Current interview state: progress plus the next question to ask (or completion).

```json
{
  "sessionId": "sess_…",
  "status": "active",
  "progress": { "answered": 3, "total": 18 },
  "complete": false,
  "canGoBack": true,
  "isLast": false,
  "question": {
    "id": "story", "phase": "basics", "text": "Tell the story…", "help": "…",
    "type": "longtext", "options": null, "placeholder": null, "required": true,
    "defaultValue": null
  }
}
```

When the interview is finished, `complete` is `true`, `status` is `"complete"`, and
`question` is `null`. For the `pages` question, `options` is resolved dynamically
(industry-aware, via the cheap model, falling back to static defaults) and
`defaultValue` pre-selects the suggested pages.

- `canGoBack` — `true` once at least one answer has been recorded for this
  session (i.e. there's something for `POST /back` to undo). `false` on the
  first question, so the client can hide/disable its Back button with no error.
- `isLast` — `true` when the returned `question` is the only visible question
  left to answer; the client uses this to label its primary button **Finish**
  instead of **Continue**.

### POST /api/interview/:sessionId/answer
Submit an answer, persist it (upsert on `session_id + question_id`), advance, and
return the next question.

Request body:

```json
{ "questionId": "business_name", "value": "Grace Fellowship" }
```

- `value` may be a string, list, boolean, or object depending on the question type;
  it is stored JSON-encoded.
- `400 bad_request` if `questionId` is unknown/missing, if a `required` question is
  answered empty, or if the session is already `complete`.

Response `200`:

```json
{
  "saved": true,
  "followUp": null,
  "sessionId": "sess_…",
  "status": "active",
  "progress": { "answered": 4, "total": 18 },
  "complete": false,
  "canGoBack": true,
  "isLast": false,
  "question": { "id": "goals", "phase": "goals", "…": "…" }
}
```

- `followUp` — an optional adaptive follow-up string (only for a thin `story`
  answer, via the cheap model); `null` otherwise. It's guidance, not a blocking
  question — the deterministic flow still advances.
- Answering the **last** question sets `complete: true`, `question: null`, flips the
  session to `complete`, and advances the project from `interview` to `ingesting`
  (caching `industry` and `tone` onto the project).

### POST /api/interview/:sessionId/back
Undo the most recently answered question and step back to it — the client's Back
button. No request body.

- Deletes the most-recently-updated `interview_answers` row for the session
  (`ORDER BY updated_at DESC LIMIT 1`).
- `400 bad_request` ("Nothing to go back to.") if the session has no answers yet
  (i.e. `canGoBack` was `false`).
- If the session was `complete`, it's reopened to `active` (and the project is
  stepped back from `ingesting` to `interview`, but only if nothing beyond the
  interview has started).
- Recomputes the next question from the remaining answers and updates the
  session's `next_question_id`/`phase` accordingly.

Response `200` — same shape as `GET /api/interview/:sessionId`, with `question`
set to the one whose answer was just removed:

```json
{
  "sessionId": "sess_…",
  "status": "active",
  "progress": { "answered": 3, "total": 18 },
  "complete": false,
  "canGoBack": true,
  "isLast": false,
  "question": { "id": "story", "phase": "basics", "…": "…" }
}
```

### GET /api/interview/:sessionId/profile
The structured `SiteProfile` — the Phase 1 deliverable. Readable any time (partial
before completion) so the review UI can show progress.

```json
{
  "sessionId": "sess_…",
  "projectId": "proj_…",
  "complete": true,
  "profile": {
    "business": { "name": "…", "industry": "…", "tagline": "…", "story": "…" },
    "goals": ["…"],
    "pages": ["Home", "About", "…"],
    "brand": { "hasLogo": true, "colors": "…", "fonts": "…", "generatePalette": false },
    "presence": { "website": "…", "facebook": "…", "instagram": "…", "googleBusiness": "…" },
    "contact": { "email": "…", "phone": "…", "address": "…", "hours": "…" },
    "tone": "Warm",
    "content": { "ownership": "…", "donationUrl": "…", "bookingUrl": "…" }
  }
}
```

`pages` falls back to the industry default set when the client hasn't chosen any;
`brand.generatePalette` is inferred true when colors are blank or the client asked
for a generated palette.

---

## Sales demos (operator only)

One-click sample sites for pitching prospects. Creates a real project seeded with
synthetic interview answers + confirmed catalog content, then runs the normal
generate pipeline. No live interview required.

### GET /api/demos/industries
List industries the demo catalog supports (with default theme id/name).

```json
{ "industries": [ { "industry": "Day spa / Salon", "themeId": "haven", "themeName": "Haven" }, … ] }
```

### POST /api/demos
Build a demo site from a short brief.

Request body:

```json
{
  "businessName": "Aura Day Spa",
  "industry": "Day spa / Salon",
  "tagline": "optional",
  "blurb": "optional short about",
  "phone": "optional",
  "email": "optional",
  "city": "optional",
  "logoUrl": "optional https URL",
  "themeId": "optional override"
}
```

- `businessName` and `industry` are required (`400` if missing/unknown).
- Optional `logoUrl` is fetched, stored in R2, and auto-confirmed as a logo asset.
- Project is named `Demo — {businessName}` and appears in the normal project list.

Response `201`:

```json
{
  "projectId": "proj_…",
  "clientId": "client_…",
  "buildId": "build_…",
  "version": 1,
  "themeId": "haven",
  "previewUrl": "/preview/build_…/",
  "siteUrl": "/site/proj_…/",
  "quality": { "score": 100, "pass": true },
  "demo": true
}
```
