import { Hono } from 'hono';
import type { Env, Vars } from '../types';
import { one, all, run } from '../lib/db';
import { id } from '../lib/id';
import { BadRequest, NotFound } from '../lib/errors';
import {
  parseAnswers,
  nextQuestion,
  resolveOptions,
  maybeFollowUp,
  buildProfile,
  computeInterviewState,
} from '../interview/engine';
import { questionById, type Question } from '../interview/questions';

// Client-facing interview flow. Gated by possession of the (unguessable)
// session id rather than the operator token — the operator hands a client their
// interview link and they self-serve.

export const interview = new Hono<{ Bindings: Env; Variables: Vars }>();

interface SessionRow {
  id: string;
  project_id: string;
  status: string;
  phase: string;
}

async function loadSession(c: { env: Env }, sessionId: string): Promise<SessionRow> {
  const session = await one<SessionRow>(
    c.env,
    'SELECT id, project_id, status, phase FROM interview_sessions WHERE id = ?',
    sessionId,
  );
  if (!session) throw new NotFound('interview session');
  return session;
}

async function loadAnswers(env: Env, sessionId: string) {
  const rows = await all<{ question_id: string; value_json: string }>(
    env,
    'SELECT question_id, value_json FROM interview_answers WHERE session_id = ?',
    sessionId,
  );
  return parseAnswers(rows);
}

// Serialize a question for the client, resolving any dynamic options and
// attaching sensible defaults (e.g. pre-checked industry pages).
async function presentQuestion(env: Env, q: Question, answers: Record<string, unknown>) {
  const options = await resolveOptions(env, q, answers);
  return {
    id: q.id,
    phase: q.phase,
    text: q.text,
    help: q.help ?? null,
    type: q.type,
    options: options ?? null,
    placeholder: q.placeholder ?? null,
    required: q.required,
    // For the pages multi-select, pre-select the suggested defaults.
    defaultValue: q.optionsFrom === 'industry_pages' ? options : null,
  };
}

// Build the full client-facing state: sessionId + the pure engine state
// (progress/complete/canGoBack/isLast) + the resolved next question, if any.
async function buildResponse(env: Env, session: SessionRow, answers: Record<string, unknown>) {
  const state = computeInterviewState(answers, session.status);
  return {
    sessionId: session.id,
    status: state.status,
    progress: state.progress,
    complete: state.complete,
    canGoBack: state.canGoBack,
    isLast: state.isLast,
    question: state.question ? await presentQuestion(env, state.question, answers) : null,
  };
}

// Current interview state: progress + the next question to ask (or done).
interview.get('/:sessionId', async (c) => {
  const session = await loadSession(c, c.req.param('sessionId'));
  const answers = await loadAnswers(c.env, session.id);
  return c.json(await buildResponse(c.env, session, answers));
});

// Submit an answer, persist it (upsert), advance, return the next question.
interview.post('/:sessionId/answer', async (c) => {
  const session = await loadSession(c, c.req.param('sessionId'));
  if (session.status === 'complete') throw new BadRequest('This interview is already complete.');

  const body = await c.req
    .json<{ questionId?: string; value?: unknown }>()
    .catch(() => ({}) as { questionId?: string; value?: unknown });
  const q = body.questionId ? questionById(body.questionId) : undefined;
  if (!q) throw new BadRequest('Unknown or missing questionId.');

  // Validate required answers are non-empty.
  const v = body.value;
  const empty =
    v === undefined ||
    v === null ||
    (typeof v === 'string' && v.trim() === '') ||
    (Array.isArray(v) && v.length === 0);
  if (q.required && empty) throw new BadRequest(`"${q.text}" is required.`);

  // Type/shape validation so malformed answers fail loudly instead of being
  // silently coerced (e.g. a multi_select sent as a bare string -> dropped).
  if (!empty) {
    if (q.type === 'multi_select' && !Array.isArray(v)) {
      throw new BadRequest(`"${q.text}" expects a list of selections.`);
    }
    if (q.type === 'boolean' && typeof v !== 'boolean') {
      throw new BadRequest(`"${q.text}" expects yes or no.`);
    }
    // For single-select with a fixed option set, the value must be one of them.
    // (multi_select page lists are resolved dynamically, so they're not checked
    // for membership — only that they're an array.)
    if (q.type === 'single_select' && q.options && typeof v === 'string' && !q.options.includes(v)) {
      throw new BadRequest(`"${v}" is not a valid choice for "${q.text}".`);
    }
  }

  const answerId = id('ans');
  await run(
    c.env,
    `INSERT INTO interview_answers (id, session_id, question_id, question_text, value_json, source)
     VALUES (?, ?, ?, ?, ?, 'user')
     ON CONFLICT (session_id, question_id)
     DO UPDATE SET value_json = excluded.value_json,
                   question_text = excluded.question_text,
                   updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`,
    answerId,
    session.id,
    q.id,
    q.text,
    JSON.stringify(v ?? null),
  );

  const answers = await loadAnswers(c.env, session.id);

  // Optional adaptive follow-up (e.g. thin story) — surfaced as guidance, not a
  // blocking question, so the deterministic flow stays predictable.
  const followUp = await maybeFollowUp(c.env, q, answers);

  const next = nextQuestion(answers);
  if (!next) {
    await run(
      c.env,
      `UPDATE interview_sessions SET status='complete', next_question_id=NULL,
              updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      session.id,
    );
    await run(
      c.env,
      `UPDATE projects SET status='ingesting', industry = COALESCE(industry, ?), tone = COALESCE(tone, ?),
              updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      typeof answers['industry'] === 'string' ? answers['industry'] : null,
      typeof answers['tone'] === 'string' ? answers['tone'] : null,
      session.project_id,
    );
  } else {
    await run(
      c.env,
      `UPDATE interview_sessions SET next_question_id = ?, phase = ?,
              updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      next.id,
      next.phase,
      session.id,
    );
  }

  return c.json({
    saved: true,
    followUp,
    ...(await buildResponse(c.env, session, answers)),
  });
});

// Undo the most recent answer and step back to that question. Used by the
// client's Back button — it does not "unskip" anything, it just removes the
// latest answer row and lets the deterministic engine recompute the next
// (now-unanswered) question from what remains.
interview.post('/:sessionId/back', async (c) => {
  const session = await loadSession(c, c.req.param('sessionId'));

  const last = await one<{ id: string }>(
    c.env,
    'SELECT id FROM interview_answers WHERE session_id = ? ORDER BY updated_at DESC, id DESC LIMIT 1',
    session.id,
  );
  if (!last) throw new BadRequest('Nothing to go back to.');

  await run(c.env, 'DELETE FROM interview_answers WHERE id = ?', last.id);

  if (session.status === 'complete') {
    await run(
      c.env,
      `UPDATE interview_sessions SET status='active',
              updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
      session.id,
    );
    // Step the project back out of ingestion — but only if nothing downstream
    // has actually started yet, so we never clobber real ingestion/build progress.
    await run(
      c.env,
      `UPDATE projects SET status='interview',
              updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ? AND status = 'ingesting'`,
      session.project_id,
    );
    session.status = 'active';
  }

  const answers = await loadAnswers(c.env, session.id);
  const next = nextQuestion(answers);
  await run(
    c.env,
    `UPDATE interview_sessions SET next_question_id = ?, phase = ?,
            updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`,
    next?.id ?? null,
    next?.phase ?? session.phase,
    session.id,
  );

  return c.json(await buildResponse(c.env, session, answers));
});

// The structured profile — the Phase 1 deliverable. Available once complete,
// but we allow reading a partial profile any time for the review UI.
interview.get('/:sessionId/profile', async (c) => {
  const session = await loadSession(c, c.req.param('sessionId'));
  const answers = await loadAnswers(c.env, session.id);
  return c.json({
    sessionId: session.id,
    projectId: session.project_id,
    complete: nextQuestion(answers) === null,
    profile: buildProfile(answers),
  });
});
